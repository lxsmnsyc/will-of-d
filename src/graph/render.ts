import type { ZoomTransform } from 'd3-zoom';
import { RELATION_STYLES } from '../data/types';
import type { Graph, GraphLink, GraphNode } from './model';
import { getPortrait, initials } from './portraits';
import type { Theme } from './theme';
import { mixHex, withAlpha } from './theme';

export interface Focus {
  nodes: Set<string>;
  links: Set<string>;
}

export interface Scene {
  graph: Graph;
  transform: ZoomTransform;
  width: number;
  height: number;
  dpr: number;
  theme: Theme;
  focus: Focus | null;
  hoveredId: string | null;
  selectedId: string | null;
}

const LABEL_FONT =
  '500 12px ui-sans-serif, system-ui, -apple-system, sans-serif';
const DIM_ALPHA = 0.1;
/** Below this on-screen radius a face is mush, so draw the disc instead. */
const PORTRAIT_MIN_RADIUS = 8;

function familyColor(link: GraphLink, theme: Theme): string {
  if (link.family === 'kinship') return theme.kinship;
  if (link.family === 'mentorship') return theme.mentorship;
  return theme.devotion;
}

/** Dash pattern in world units, so it stays constant on screen. */
function dashPattern(link: GraphLink, scale: number): number[] {
  const dash = RELATION_STYLES[link.type].dash;
  if (dash === 'dashed') return [7 / scale, 5 / scale];
  if (dash === 'dotted') return [0.5 / scale, 4.5 / scale];
  return [];
}

/** Control point of the quadratic used for this link. */
function control(link: GraphLink): { cx: number; cy: number } {
  const sx = link.source.x ?? 0;
  const sy = link.source.y ?? 0;
  const tx = link.target.x ?? 0;
  const ty = link.target.y ?? 0;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  if (link.parallelCount === 1) return { cx: mx, cy: my };

  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy) || 1;
  const offset =
    (link.parallelIndex - (link.parallelCount - 1) / 2) *
    Math.min(0.36, 1.1 / link.parallelCount) *
    length;
  return { cx: mx + (-dy / length) * offset, cy: my + (dx / length) * offset };
}

function drawLink(
  ctx: CanvasRenderingContext2D,
  link: GraphLink,
  theme: Theme,
  scale: number,
  lit: boolean,
): void {
  const { cx, cy } = control(link);
  ctx.beginPath();
  ctx.moveTo(link.source.x ?? 0, link.source.y ?? 0);
  ctx.quadraticCurveTo(cx, cy, link.target.x ?? 0, link.target.y ?? 0);
  ctx.lineWidth = (lit ? 2.25 : 1.5) / scale;
  ctx.strokeStyle = lit ? familyColor(link, theme) : theme.edgeIdle;
  ctx.setLineDash(dashPattern(link, scale));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  link: GraphLink,
  theme: Theme,
  scale: number,
  lit: boolean,
): void {
  if (!RELATION_STYLES[link.type].directed) return;

  const tx = link.target.x ?? 0;
  const ty = link.target.y ?? 0;
  const { cx, cy } = control(link);

  // Tangent at the end of a quadratic is the vector from the control point.
  let dx = tx - cx;
  let dy = ty - cy;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  const gap = link.target.radius + 2.5 / scale;
  const tipX = tx - dx * gap;
  const tipY = ty - dy * gap;
  const size = (lit ? 9 : 7) / scale;

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - dx * size + -dy * size * 0.42,
    tipY - dy * size + dx * size * 0.42,
  );
  ctx.lineTo(
    tipX - dx * size - -dy * size * 0.42,
    tipY - dy * size - dx * size * 0.42,
  );
  ctx.closePath();
  ctx.fillStyle = lit ? familyColor(link, theme) : theme.edgeIdle;
  ctx.fill();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  theme: Theme,
  scale: number,
  emphasised: boolean,
  withPortrait: boolean,
): void {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const onScreenRadius = node.radius * scale;
  const portrait =
    withPortrait && onScreenRadius >= PORTRAIT_MIN_RADIUS
      ? getPortrait(node.id)
      : null;

  ctx.beginPath();
  ctx.arc(x, y, node.radius, 0, Math.PI * 2);
  ctx.fillStyle = mixHex(theme.nodeLow, theme.nodeHigh, node.weight);
  ctx.fill();

  if (portrait) {
    ctx.save();
    ctx.clip();
    ctx.drawImage(
      portrait,
      x - node.radius,
      y - node.radius,
      node.radius * 2,
      node.radius * 2,
    );
    ctx.restore();
  } else if (withPortrait && onScreenRadius >= PORTRAIT_MIN_RADIUS) {
    // No portrait on file: initials keep the node identifiable up close.
    // Dimmed nodes skip them, or the background turns into a wall of letters.
    ctx.save();
    ctx.font = `600 ${node.radius}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = node.weight > 0.5 ? theme.nodeRing : theme.textPrimary;
    ctx.fillText(initials(node.name), x, y + node.radius * 0.04);
    ctx.restore();
  }

  // 2px surface ring so overlapping nodes stay countable.
  ctx.beginPath();
  ctx.arc(x, y, node.radius, 0, Math.PI * 2);
  ctx.lineWidth = 2 / scale;
  ctx.strokeStyle = theme.nodeRing;
  ctx.stroke();

  if (emphasised) {
    ctx.beginPath();
    ctx.arc(x, y, node.radius + 4 / scale, 0, Math.PI * 2);
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = theme.textPrimary;
    ctx.stroke();
  }
}

export function render(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { graph, transform, width, height, theme, focus } = scene;
  const scale = transform.k;

  ctx.save();
  ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';

  const dim: GraphLink[] = [];
  const lit: GraphLink[] = [];
  for (const link of graph.links) {
    if (!focus || focus.links.has(link.id)) lit.push(link);
    else dim.push(link);
  }

  if (dim.length > 0) {
    ctx.globalAlpha = DIM_ALPHA;
    for (const link of dim) drawLink(ctx, link, theme, scale, false);
    for (const link of dim) drawArrow(ctx, link, theme, scale, false);
    ctx.globalAlpha = 1;
  }

  if (!focus) {
    ctx.globalAlpha = 0.55;
    for (const link of lit) drawLink(ctx, link, theme, scale, true);
    for (const link of lit) drawArrow(ctx, link, theme, scale, true);
    ctx.globalAlpha = 1;
  } else {
    for (const link of lit) drawLink(ctx, link, theme, scale, true);
    for (const link of lit) drawArrow(ctx, link, theme, scale, true);
  }

  const dimNodes: GraphNode[] = [];
  const litNodes: GraphNode[] = [];
  for (const node of graph.nodes) {
    if (!focus || focus.nodes.has(node.id)) litNodes.push(node);
    else dimNodes.push(node);
  }

  if (dimNodes.length > 0) {
    ctx.globalAlpha = DIM_ALPHA + 0.12;
    for (const node of dimNodes) {
      drawNode(ctx, node, theme, scale, false, false);
    }
    ctx.globalAlpha = 1;
  }

  for (const node of litNodes) {
    drawNode(
      ctx,
      node,
      theme,
      scale,
      node.id === scene.selectedId || node.id === scene.hoveredId,
      true,
    );
  }

  ctx.restore();

  drawLabels(ctx, scene);
}

function labelPriority(scene: Scene, node: GraphNode): number {
  if (node.id === scene.selectedId || node.id === scene.hoveredId) return 3;
  if (scene.focus?.nodes.has(node.id)) return 2;
  if (!scene.focus && node.radius * scene.transform.k >= 12) return 1;
  return 0;
}

function drawLabels(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { transform, theme, width, height } = scene;
  ctx.save();
  ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';

  const candidates = scene.graph.nodes
    .map(node => ({ node, priority: labelPriority(scene, node) }))
    .filter(entry => entry.priority > 0)
    .sort((a, b) => b.priority - a.priority || b.node.weight - a.node.weight);

  const placed: { x: number; y: number; w: number }[] = [];

  for (const { node, priority } of candidates) {
    const x = transform.applyX(node.x ?? 0);
    const y = transform.applyY(node.y ?? 0) + node.radius * transform.k + 5;
    if (x < -80 || x > width + 80 || y < -20 || y > height + 20) continue;

    const text = node.name;
    const w = ctx.measureText(text).width;

    const collides = placed.some(
      other =>
        Math.abs(other.y - y) < 13 &&
        Math.abs(other.x - x) < (other.w + w) / 2 + 6,
    );
    if (collides && priority < 3) continue;
    placed.push({ x, y, w });

    ctx.lineWidth = 3;
    ctx.strokeStyle = withAlpha(theme.surface, 0.92);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = priority >= 2 ? theme.textPrimary : theme.textSecondary;
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}
