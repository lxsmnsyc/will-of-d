import { createMemo, createSignal, For, Show } from 'solid-js';
import type { Graph, GraphNode } from '../graph/model';
import { Avatar } from './Avatar';

export interface SearchBoxProps {
  graph: Graph;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
}

const MAX_RESULTS = 8;

export function SearchBox(props: SearchBoxProps) {
  const [query, setQuery] = createSignal('');
  const [open, setOpen] = createSignal(false);
  const [cursor, setCursor] = createSignal(0);

  const results = createMemo<GraphNode[]>(() => {
    const needle = query().trim().toLowerCase();
    if (needle.length === 0) return [];
    return props.graph.nodes
      .filter(node => node.search.includes(needle))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
        return aStarts - bStarts || b.weight - a.weight;
      })
      .slice(0, MAX_RESULTS);
  });

  function pick(node: GraphNode): void {
    props.onPick(node.id);
    props.onHover(null);
    setQuery(node.name);
    setOpen(false);
    setCursor(0);
  }

  function onKeyDown(event: KeyboardEvent): void {
    const list = results();
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (list.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(c => (c + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(c => (c - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const node = list[Math.min(cursor(), list.length - 1)];
      if (node) pick(node);
    }
  }

  return (
    <div class="search">
      <input
        type="search"
        placeholder="Search a character…"
        aria-label="Search a character"
        autocomplete="off"
        value={query()}
        onInput={event => {
          setQuery(event.currentTarget.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <Show when={open() && query().trim().length > 0}>
        <Show
          when={results().length > 0}
          fallback={
            <ul class="search-results">
              <li class="search-empty">Nobody by that name.</li>
            </ul>
          }
        >
          <ul class="search-results">
            <For each={results()}>
              {(node, index) => (
                <li>
                  <button
                    type="button"
                    data-active={String(index() === cursor())}
                    onClick={() => pick(node)}
                    onMouseEnter={() => props.onHover(node.id)}
                    onMouseLeave={() => props.onHover(null)}
                  >
                    <Avatar id={node.id} name={node.name} size={26} />
                    <span>
                      {node.name}
                      <small>
                        {node.affiliation}
                        {node.epithet ? ` · ${node.epithet}` : ''}
                      </small>
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
