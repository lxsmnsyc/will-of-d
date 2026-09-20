import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';
import { select } from 'd3-selection';
import {
  zoom,
  zoomIdentity,
  type ZoomBehavior,
  type ZoomTransform,
} from 'd3-zoom';
import { createEffect, onSettled } from 'solid-js';
import type { Graph, GraphLink, GraphNode } from '../graph/model';
import { render, type Focus, type Scene } from '../graph/render';
import { onPortraitLoaded } from '../graph/portraits';
import { readTheme, watchTheme } from '../graph/theme';

export interface FocusRequest {
  id: string;
  nonce: number;
}

export interface GraphCanvasProps {
  graph: Graph;
  selectedId: string | null;
  hoveredId: string | null;
  focusRequest: FocusRequest | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 5;
const CAMERA_MS = 420;

function buildFocus(graph: Graph, id: string | null): Focus | null {
  if (!id) return null;
  const nodes = new Set<string>([id]);
  for (const neighbour of graph.neighbours.get(id) ?? []) nodes.add(neighbour);
  const links = new Set<string>(
    (graph.linksByNode.get(id) ?? []).map(link => link.id),
  );
  return { nodes, links };
}

export function GraphCanvas(props: GraphCanvasProps) {
  let canvas!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let simulation: Simulation<GraphNode, GraphLink> | null = null;
  let zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> | null = null;
  let frame = 0;
  let cameraFrame = 0;
  let dragging: GraphNode | null = null;
  let moved = false;

  const scene: Scene = {
    // Assigned in setup(); the component body must not read props.
    graph: undefined as unknown as Graph,
    transform: zoomIdentity,
    width: 1,
    height: 1,
    dpr: 1,
    theme: {
      surface: '#ffffff',
      border: '#dddddd',
      textPrimary: '#000000',
      textSecondary: '#555555',
      kinship: '#2a78d6',
      mentorship: '#eb6834',
      devotion: '#1baf7a',
      nodeLow: '#cccccc',
      nodeHigh: '#333333',
      nodeRing: '#ffffff',
      edgeIdle: '#bbbbbb',
    },
    focus: null,
    hoveredId: null,
    selectedId: null,
  };

  function draw(): void {
    frame = 0;
    if (!ctx) return;
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    render(ctx, scene);
  }

  function schedule(): void {
    if (frame !== 0) return;
    frame = requestAnimationFrame(draw);
  }

  function pick(clientX: number, clientY: number): GraphNode | null {
    const rect = canvas.getBoundingClientRect();
    const [x, y] = scene.transform.invert([
      clientX - rect.left,
      clientY - rect.top,
    ]);
    let best: GraphNode | null = null;
    let bestDistance = Infinity;
    for (const node of scene.graph.nodes) {
      const dx = (node.x ?? 0) - x;
      const dy = (node.y ?? 0) - y;
      const distance = Math.hypot(dx, dy);
      const reach = node.radius + 6 / scene.transform.k;
      if (distance <= reach && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = globalThis.devicePixelRatio || 1;
    scene.width = Math.max(1, rect.width);
    scene.height = Math.max(1, rect.height);
    scene.dpr = dpr;
    canvas.width = Math.round(scene.width * dpr);
    canvas.height = Math.round(scene.height * dpr);
    schedule();
  }

  function moveCamera(target: ZoomTransform): void {
    if (!zoomBehavior) return;
    const from = scene.transform;
    const start = performance.now();
    cancelAnimationFrame(cameraFrame);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / CAMERA_MS);
      // easeInOutCubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const next = zoomIdentity
        .translate(
          from.x + (target.x - from.x) * e,
          from.y + (target.y - from.y) * e,
        )
        .scale(from.k + (target.k - from.k) * e);
      zoomBehavior!.transform(select(canvas), next);
      if (t < 1) cameraFrame = requestAnimationFrame(step);
    };

    cameraFrame = requestAnimationFrame(step);
  }

  /** Frames every node with a little air around the outliers. */
  function fitToContent(animate: boolean): void {
    const nodes = scene.graph.nodes;
    if (nodes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      minX = Math.min(minX, x - node.radius);
      minY = Math.min(minY, y - node.radius);
      maxX = Math.max(maxX, x + node.radius);
      maxY = Math.max(maxY, y + node.radius);
    }

    const pad = 40;
    const k = Math.max(
      MIN_SCALE,
      Math.min(
        1.4,
        (scene.width - pad * 2) / Math.max(1, maxX - minX),
        (scene.height - pad * 2) / Math.max(1, maxY - minY),
      ),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const target = zoomIdentity
      .translate(scene.width / 2 - cx * k, scene.height / 2 - cy * k)
      .scale(k);

    if (animate) moveCamera(target);
    else if (zoomBehavior) zoomBehavior.transform(select(canvas), target);
  }

  function centreOn(node: GraphNode): void {
    const k = Math.max(scene.transform.k, 1.1);
    moveCamera(
      zoomIdentity
        .translate(
          scene.width / 2 - (node.x ?? 0) * k,
          scene.height / 2 - (node.y ?? 0) * k,
        )
        .scale(k),
    );
  }

  function setup(): () => void {
    ctx = canvas.getContext('2d');
    scene.graph = props.graph;
    scene.theme = readTheme(canvas);
    resize();

    simulation = forceSimulation<GraphNode, GraphLink>(scene.graph.nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(scene.graph.links)
          .id(node => node.id)
          .distance(link => 62 + link.source.radius + link.target.radius)
          .strength(0.24),
      )
      .force(
        'charge',
        forceManyBody<GraphNode>()
          .strength(node => -260 - node.radius * 16)
          .distanceMax(1400),
      )
      .force(
        'collide',
        forceCollide<GraphNode>()
          .radius(node => node.radius + 11)
          .iterations(2),
      )
      .force('x', forceX<GraphNode>(0).strength(0.04))
      .force('y', forceY<GraphNode>(0).strength(0.05))
      .on('tick', schedule);

    zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .filter((event: any) => {
        if (event.type === 'wheel') return true;
        if ('button' in event && event.button) return false;
        const touch = 'touches' in event ? event.touches[0] : event;
        if (touch && 'clientX' in touch) {
          return pick(touch.clientX, touch.clientY) === null;
        }
        return true;
      })
      .on('zoom', event => {
        scene.transform = event.transform;
        schedule();
      });

    const selection = select(canvas);
    selection.call(zoomBehavior);
    selection.on('dblclick.zoom', null);

    // Settle off-screen so the first paint is a readable layout rather than a
    // few seconds of nodes flying apart. Manual ticks fire no 'tick' event.
    simulation.stop();
    for (let i = 0; i < 500; i += 1) simulation.tick();
    fitToContent(false);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    onPortraitLoaded(schedule);

    const stopTheme = watchTheme(() => {
      scene.theme = readTheme(canvas);
      schedule();
    });

    const onPointerDown = (event: PointerEvent) => {
      moved = false;
      const node = pick(event.clientX, event.clientY);
      if (!node) return;
      dragging = node;
      node.fx = node.x;
      node.fy = node.y;
      simulation?.alphaTarget(0.3).restart();
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.grabbing = 'true';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        moved = true;
        const rect = canvas.getBoundingClientRect();
        const [x, y] = scene.transform.invert([
          event.clientX - rect.left,
          event.clientY - rect.top,
        ]);
        dragging.fx = x;
        dragging.fy = y;
        schedule();
        return;
      }
      const node = pick(event.clientX, event.clientY);
      canvas.dataset.overNode = node ? 'true' : 'false';
      props.onHover(node ? node.id : null);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging.fx = null;
      dragging.fy = null;
      dragging = null;
      simulation?.alphaTarget(0);
      canvas.releasePointerCapture(event.pointerId);
      canvas.dataset.grabbing = 'false';
    };

    const onClick = (event: MouseEvent) => {
      if (moved) return;
      const node = pick(event.clientX, event.clientY);
      props.onSelect(node ? node.id : null);
    };

    const onLeave = () => {
      if (dragging) return;
      canvas.dataset.overNode = 'false';
      props.onHover(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(cameraFrame);
      simulation?.stop();
      observer.disconnect();
      onPortraitLoaded(null);
      stopTheme();
      selection.on('.zoom', null);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }

  onSettled(() => setup());

  createEffect(
    () => [props.selectedId, props.hoveredId] as const,
    ([selectedId, hoveredId]) => {
      if (!scene.graph) return;
      scene.selectedId = selectedId;
      scene.hoveredId = hoveredId;
      scene.focus = buildFocus(scene.graph, selectedId ?? hoveredId);
      schedule();
    },
  );

  createEffect(
    () => props.focusRequest,
    request => {
      if (!request || !scene.graph) return;
      const node = scene.graph.byId.get(request.id);
      if (node) centreOn(node);
    },
    { defer: true },
  );

  return (
    <canvas
      class="graph-canvas"
      ref={el => (canvas = el)}
      aria-label="Relationship graph of One Piece characters"
    />
  );
}
