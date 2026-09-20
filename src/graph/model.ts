import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { CHARACTERS, RELATIONS } from '../data';
import type { RelationFamily, RelationType } from '../data/types';
import { RELATION_STYLES } from '../data/types';
import { detectCommunities } from './communities';
import { pageRank } from './pagerank';

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  epithet?: string;
  affiliation: string;
  arcTitle: string;
  /** Raw PageRank score over the reversed relation graph. */
  rank: number;
  /** Rank position, 1 being the most influential. */
  rankPosition: number;
  /** Blend of PageRank and degree, 0..1, driving radius and fill. */
  weight: number;
  /** Community index, used by the layout to keep related nodes together. */
  cluster: number;
  radius: number;
  degree: number;
  /** Lowercased haystack for the search box. */
  search: string;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  source: GraphNode;
  target: GraphNode;
  type: RelationType;
  family: RelationFamily;
  note?: string;
  arcTitle: string;
  /** How many relations share this exact pair, and which one this is. */
  parallelIndex: number;
  parallelCount: number;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
  byId: Map<string, GraphNode>;
  /** Every link touching a node, in either direction. */
  linksByNode: Map<string, GraphLink[]>;
  neighbours: Map<string, Set<string>>;
}

const MIN_RADIUS = 8;
const MAX_RADIUS = 128;

export function buildGraph(): Graph {
  const ids = CHARACTERS.map(character => character.id);

  // The walk runs toward whoever each relation makes important: the mentor,
  // the parent, the rescuer — but the lord for loyalty, and both ends for a
  // partnership.
  const rankEdges: { from: string; to: string }[] = [];
  for (const relation of RELATIONS) {
    const { credits } = RELATION_STYLES[relation.type];
    if (credits === 'source' || credits === 'both') {
      rankEdges.push({ from: relation.to, to: relation.from });
    }
    if (credits === 'target' || credits === 'both') {
      rankEdges.push({ from: relation.from, to: relation.to });
    }
  }
  const ranks = pageRank(ids, rankEdges);

  const degree = new Map<string, number>(ids.map(id => [id, 0]));
  for (const relation of RELATIONS) {
    degree.set(relation.from, (degree.get(relation.from) ?? 0) + 1);
    degree.set(relation.to, (degree.get(relation.to) ?? 0) + 1);
  }

  const adjacency = new Map<string, Set<string>>(
    ids.map(id => [id, new Set<string>()]),
  );
  for (const relation of RELATIONS) {
    adjacency.get(relation.from)!.add(relation.to);
    adjacency.get(relation.to)!.add(relation.from);
  }
  const clusters = detectCommunities(ids, adjacency);

  const rankValues = ids.map(id => ranks.get(id) ?? 0);
  const minRank = Math.min(...rankValues) || Number.EPSILON;
  const maxRank = Math.max(...rankValues);
  const rankLogSpan = Math.log(maxRank / minRank) || 1;
  const maxDegree = Math.max(...ids.map(id => degree.get(id) ?? 0), 1);
  const degreeRootSpan = Math.sqrt(maxDegree) || 1;

  const positions = new Map(
    [...ids]
      .sort((a, b) => (ranks.get(b) ?? 0) - (ranks.get(a) ?? 0))
      .map((id, i) => [id, i + 1]),
  );

  // Square root, so a node's area rather than its width tracks its connection
  // count. A log scale was too flat at the top: Luffy has twice the connections
  // of Whitebeard and log put them within a couple of pixels of each other.
  // Connection count leads: PageRank on a graph this sparse hands a huge score
  // to anyone sitting upstream of a busy character, which would size Ace's
  // mother like a Yonko.
  const scoreOf = (id: string) => {
    const rank = ranks.get(id) ?? minRank;
    const rankShare = Math.log(rank / minRank) / rankLogSpan;
    const degreeShare = Math.sqrt(degree.get(id) ?? 0) / degreeRootSpan;
    return 0.78 * degreeShare + 0.22 * rankShare;
  };

  const scores = new Map(ids.map(id => [id, scoreOf(id)]));
  // Ranking the scores spreads the sizes evenly across the cast, but three
  // quarters of the cast sit on four connections or fewer, so leaning on it
  // hands most of the radius band to the tail. Keep it as a minority term:
  // enough to separate one bond from three, not enough to flatten the top.
  const ordered = [...ids].sort(
    (a, b) => (scores.get(a) ?? 0) - (scores.get(b) ?? 0),
  );
  const percentile = new Map(
    ordered.map((id, i) => [id, ids.length > 1 ? i / (ids.length - 1) : 1]),
  );

  const nodes: GraphNode[] = CHARACTERS.map(character => {
    const rank = ranks.get(character.id) ?? 0;
    const weight =
      0.3 * (percentile.get(character.id) ?? 0) +
      0.7 * (scores.get(character.id) ?? 0);
    return {
      id: character.id,
      name: character.name,
      epithet: character.epithet,
      affiliation: character.affiliation,
      arcTitle: character.arcTitle,
      rank,
      rankPosition: positions.get(character.id) ?? ids.length,
      weight,
      radius: MIN_RADIUS + weight * (MAX_RADIUS - MIN_RADIUS),
      cluster: clusters.get(character.id) ?? 0,
      degree: degree.get(character.id) ?? 0,
      search: [character.name, character.epithet, character.affiliation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });

  const byId = new Map(nodes.map(node => [node.id, node]));

  const pairCounts = new Map<string, number>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const relation of RELATIONS) {
    const key = pairKey(relation.from, relation.to);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  const pairSeen = new Map<string, number>();
  const links: GraphLink[] = RELATIONS.map(relation => {
    const key = pairKey(relation.from, relation.to);
    const parallelIndex = pairSeen.get(key) ?? 0;
    pairSeen.set(key, parallelIndex + 1);
    return {
      id: `${relation.from}->${relation.to}:${relation.type}`,
      source: byId.get(relation.from)!,
      target: byId.get(relation.to)!,
      type: relation.type,
      family: RELATION_STYLES[relation.type].family,
      note: relation.note,
      arcTitle: relation.arcTitle,
      parallelIndex,
      parallelCount: pairCounts.get(key) ?? 1,
    };
  });

  const linksByNode = new Map<string, GraphLink[]>(ids.map(id => [id, []]));
  const neighbours = new Map<string, Set<string>>(
    ids.map(id => [id, new Set<string>()]),
  );
  for (const link of links) {
    linksByNode.get(link.source.id)!.push(link);
    linksByNode.get(link.target.id)!.push(link);
    neighbours.get(link.source.id)!.add(link.target.id);
    neighbours.get(link.target.id)!.add(link.source.id);
  }

  return { nodes, links, byId, linksByNode, neighbours };
}
