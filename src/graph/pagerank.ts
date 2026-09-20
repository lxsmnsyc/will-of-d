export interface PageRankEdge {
  from: string;
  to: string;
}

export interface PageRankOptions {
  damping?: number;
  iterations?: number;
  tolerance?: number;
}

/**
 * Standard PageRank with dangling-node mass redistributed uniformly.
 *
 * The caller decides which way the edges point. This graph feeds it the
 * reversed story edges: a surfer walks from a character to the people who
 * shaped them, so rank pools on the parents, mentors and rescuers rather than
 * on the crowd of people each of them touched.
 */
export function pageRank(
  ids: string[],
  edges: PageRankEdge[],
  options: PageRankOptions = {},
): Map<string, number> {
  const { damping = 0.85, iterations = 200, tolerance = 1e-9 } = options;
  const n = ids.length;
  const rank = new Map<string, number>();
  if (n === 0) return rank;

  const index = new Map<string, number>();
  ids.forEach((id, i) => index.set(id, i));

  const outgoing: number[][] = ids.map(() => []);
  const outDegree: number[] = Array.from({ length: n }, () => 0);

  for (const edge of edges) {
    const from = index.get(edge.from);
    const to = index.get(edge.to);
    if (from === undefined || to === undefined) continue;
    outgoing[from].push(to);
    outDegree[from] += 1;
  }

  let current: number[] = Array.from({ length: n }, () => 1 / n);
  let next: number[] = Array.from({ length: n }, () => 0);

  for (let step = 0; step < iterations; step += 1) {
    let dangling = 0;
    for (let i = 0; i < n; i += 1) {
      next[i] = 0;
      if (outDegree[i] === 0) dangling += current[i];
    }

    for (let i = 0; i < n; i += 1) {
      if (outDegree[i] === 0) continue;
      const share = current[i] / outDegree[i];
      for (const target of outgoing[i]) {
        next[target] += share;
      }
    }

    const base = (1 - damping) / n + (damping * dangling) / n;
    let delta = 0;
    for (let i = 0; i < n; i += 1) {
      const value = base + damping * next[i];
      delta += Math.abs(value - current[i]);
      next[i] = value;
    }

    const swap = current;
    current = next;
    next = swap;

    if (delta < tolerance) break;
  }

  ids.forEach((id, i) => rank.set(id, current[i]));
  return rank;
}
