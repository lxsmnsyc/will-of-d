/**
 * Louvain community detection over the undirected relation graph.
 *
 * The force layout on its own only knows about individual edges, so a tightly
 * connected group with few bonds leading out of it drifts into whatever gap the
 * global gravity leaves — which is how the Five Elders came to sit between
 * Kalgara and Mont Blanc Cricket. Grouping first lets the layout give each
 * group its own patch of canvas.
 *
 * Label propagation was the obvious first choice and it fails badly here: the
 * cast is bridged densely enough that one label floods 387 of the 468
 * characters. Modularity optimisation instead recovers the groups a reader
 * would name — the Charlotte family, the Beasts Pirates, Cipher Pol and the
 * Five Elders above them.
 *
 * Node order is fixed and improvements need to clear a tolerance, so the same
 * dataset always produces the same grouping and the graph opens the same way
 * twice.
 */

/** Above 1 this favours more, smaller communities. */
const RESOLUTION = 2.5;
/** Each round merges the previous round's communities into larger ones. */
const ROUNDS = 2;
const EPSILON = 1e-9;

export function detectCommunities(
  ids: string[],
  neighbours: Map<string, Set<string>>,
): Map<string, number> {
  let count = ids.length;
  let membership = ids.map((_, index) => index);

  // Undirected edge weights between current-level nodes, keyed "low|high".
  let edges = new Map<string, number>();
  const index = new Map(ids.map((id, i) => [id, i]));
  for (const id of ids) {
    for (const other of neighbours.get(id) ?? []) {
      const a = index.get(id)!;
      const b = index.get(other)!;
      if (a >= b) continue;
      const key = `${a}|${b}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }

  for (let round = 0; round < ROUNDS; round += 1) {
    const adjacency: Map<number, number>[] = Array.from(
      { length: count },
      () => new Map<number, number>(),
    );
    let total = 0;
    for (const [key, weight] of edges) {
      const [a, b] = key.split('|').map(Number);
      total += 2 * weight;
      if (a === b) continue;
      adjacency[a].set(b, (adjacency[a].get(b) ?? 0) + weight);
      adjacency[b].set(a, (adjacency[b].get(a) ?? 0) + weight);
    }
    if (total === 0) break;

    const degree = adjacency.map(map => {
      let sum = 0;
      for (const weight of map.values()) sum += weight;
      return sum;
    });
    const community = degree.map((_, node) => node);
    const communityDegree = degree.slice();

    let settled = true;
    for (let pass = 0; pass < 20; pass += 1) {
      let moved = 0;

      for (let node = 0; node < count; node += 1) {
        const current = community[node];
        communityDegree[current] -= degree[node];

        const pull = new Map<number, number>();
        for (const [other, weight] of adjacency[node]) {
          const target = community[other];
          pull.set(target, (pull.get(target) ?? 0) + weight);
        }

        let best = current;
        let bestGain =
          (pull.get(current) ?? 0) -
          (RESOLUTION * communityDegree[current] * degree[node]) / total;
        for (const [candidate, weight] of pull) {
          const gain =
            weight -
            (RESOLUTION * communityDegree[candidate] * degree[node]) / total;
          if (gain > bestGain + EPSILON) {
            bestGain = gain;
            best = candidate;
          }
        }

        communityDegree[best] += degree[node];
        if (best !== current) {
          community[node] = best;
          moved += 1;
          settled = false;
        }
      }

      if (moved === 0) break;
    }
    if (settled) break;

    // Renumber, carry the membership down to the original nodes, and collapse
    // each community into a single node for the next round.
    const dense = new Map<number, number>();
    for (const id of community) {
      if (!dense.has(id)) dense.set(id, dense.size);
    }
    const next = community.map(id => dense.get(id)!);
    membership = membership.map(node => next[node]);

    const merged = new Map<string, number>();
    for (const [key, weight] of edges) {
      const [a, b] = key.split('|').map(Number);
      const x = next[a];
      const y = next[b];
      const low = Math.min(x, y);
      const high = Math.max(x, y);
      merged.set(
        `${low}|${high}`,
        (merged.get(`${low}|${high}`) ?? 0) + weight,
      );
    }
    edges = merged;
    count = dense.size;
  }

  return new Map(ids.map((id, i) => [id, membership[i]]));
}
