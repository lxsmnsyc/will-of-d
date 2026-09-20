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
          <div class="masthead-title">
            <h1>Will of D.</h1>
            <a
              class="source-link"
              href="https://github.com/lxsmnsyc/will-of-d"
              target="_blank"
              rel="noreferrer"
              aria-label="Source on GitHub"
              title="Source on GitHub"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
                />
              </svg>
            </a>
          </div>
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
