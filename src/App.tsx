import { createMemo, createSignal, Show } from 'solid-js';
import './app.css';
import { DetailPanel } from './components/DetailPanel';
import type { FocusRequest } from './components/GraphCanvas';
import { GraphCanvas } from './components/GraphCanvas';
import { Legend } from './components/Legend';
import { SearchBox } from './components/SearchBox';
import { buildGraph } from './graph/model';

const graph = buildGraph();

export default function App() {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [hoveredId, setHoveredId] = createSignal<string | null>(null);
  const [focusRequest, setFocusRequest] = createSignal<FocusRequest | null>(
    null,
  );
  const [legendOpen, setLegendOpen] = createSignal(false);

  const counts = createMemo(() => ({
    nodes: graph.nodes.length,
    links: graph.links.length,
  }));

  function focus(id: string): void {
    setSelectedId(id);
    setFocusRequest(previous => ({
      id,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }

  return (
    <main class="app" data-panel={selectedId() ? 'true' : 'false'}>
      <GraphCanvas
        graph={graph}
        selectedId={selectedId()}
        hoveredId={hoveredId()}
        focusRequest={focusRequest()}
        onHover={setHoveredId}
        onSelect={setSelectedId}
      />

      <div class="overlay overlay-top">
        <div class="masthead">
          <h1>Will of D.</h1>
          <p>
            {counts().nodes} characters · {counts().links} connections
          </p>
        </div>
        <SearchBox graph={graph} onPick={focus} onHover={setHoveredId} />
      </div>

      <Legend
        open={legendOpen()}
        onToggle={() => setLegendOpen(open => !open)}
      />

      <Show when={selectedId()}>
        {id => (
          <DetailPanel
            graph={graph}
            nodeId={id()}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        )}
      </Show>
    </main>
  );
}
