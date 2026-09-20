import { createMemo, For, Show } from 'solid-js';
import type { DashStyle, RelationType } from '../data/types';
import { RELATION_ORDER, RELATION_STYLES } from '../data/types';
import type { Graph, GraphLink } from '../graph/model';
import { Avatar } from './Avatar';

export interface DetailPanelProps {
  graph: Graph;
  nodeId: string;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

interface Entry {
  key: string;
  otherId: string;
  otherName: string;
  type: RelationType;
  verb: string;
  family: string;
  dash: DashStyle;
  note?: string;
  arcTitle: string;
}

function sortEntries(entries: Entry[]): Entry[] {
  const order = new Map(RELATION_ORDER.map((type, i) => [type, i]));
  return entries.sort(
    (a, b) =>
      (order.get(a.type) ?? 0) - (order.get(b.type) ?? 0) ||
      a.otherName.localeCompare(b.otherName),
  );
}

export function DetailPanel(props: DetailPanelProps) {
  const node = createMemo(() => props.graph.byId.get(props.nodeId));

  const links = createMemo<GraphLink[]>(
    () => props.graph.linksByNode.get(props.nodeId) ?? [],
  );

  const bonds = createMemo(() =>
    sortEntries(
      links()
        .filter(link => !RELATION_STYLES[link.type].directed)
        .map(link => {
          const other =
            link.source.id === props.nodeId ? link.target : link.source;
          return {
            key: link.id,
            otherId: other.id,
            otherName: other.name,
            type: link.type,
            verb: RELATION_STYLES[link.type].label,
            family: link.family,
            dash: RELATION_STYLES[link.type].dash,
            note: link.note,
            arcTitle: link.arcTitle,
          };
        }),
    ),
  );

  const incoming = createMemo(() =>
    sortEntries(
      links()
        .filter(
          link =>
            link.target.id === props.nodeId &&
            RELATION_STYLES[link.type].directed,
        )
        .map(link => ({
          key: link.id,
          otherId: link.source.id,
          otherName: link.source.name,
          type: link.type,
          verb: RELATION_STYLES[link.type].inverseLabel,
          family: link.family,
          dash: RELATION_STYLES[link.type].dash,
          note: link.note,
          arcTitle: link.arcTitle,
        })),
    ),
  );

  const outgoing = createMemo(() =>
    sortEntries(
      links()
        .filter(
          link =>
            link.source.id === props.nodeId &&
            RELATION_STYLES[link.type].directed,
        )
        .map(link => ({
          key: link.id,
          otherId: link.target.id,
          otherName: link.target.name,
          type: link.type,
          verb: RELATION_STYLES[link.type].label,
          family: link.family,
          dash: RELATION_STYLES[link.type].dash,
          note: link.note,
          arcTitle: link.arcTitle,
        })),
    ),
  );

  return (
    <Show when={node()}>
      {current => (
        <section class="panel" aria-label={`Relations of ${current().name}`}>
          <header class="panel-head">
            <button
              type="button"
              class="panel-close"
              aria-label="Close"
              onClick={() => props.onSelect(null)}
            >
              ×
            </button>
            <div class="panel-identity">
              <Avatar id={current().id} name={current().name} size={56} />
              <div>
                <h2>{current().name}</h2>
                <Show when={current().epithet}>
                  {epithet => <p class="panel-epithet">“{epithet()}”</p>}
                </Show>
              </div>
            </div>
            <div class="panel-meta">
              <span class="chip">{current().affiliation}</span>
              <span class="chip">First seen: {current().arcTitle}</span>
              <span class="chip">
                {current().degree}{' '}
                {current().degree === 1 ? 'relation' : 'relations'}
              </span>
            </div>
          </header>

          <div class="panel-body">
            <Show when={bonds().length > 0}>
              <h3>Bonds</h3>
              <ul class="relation-list">
                <For each={bonds()}>
                  {entry => (
                    <RelationRow entry={entry} {...rowHandlers(props)} />
                  )}
                </For>
              </ul>
            </Show>

            <Show when={incoming().length > 0}>
              <h3>What they were given</h3>
              <ul class="relation-list">
                <For each={incoming()}>
                  {entry => (
                    <RelationRow entry={entry} {...rowHandlers(props)} />
                  )}
                </For>
              </ul>
            </Show>

            <Show when={outgoing().length > 0}>
              <h3>What they gave</h3>
              <ul class="relation-list">
                <For each={outgoing()}>
                  {entry => (
                    <RelationRow entry={entry} {...rowHandlers(props)} />
                  )}
                </For>
              </ul>
            </Show>

            <Show
              when={
                bonds().length === 0 &&
                incoming().length === 0 &&
                outgoing().length === 0
              }
            >
              <p class="empty">No recorded relations yet.</p>
            </Show>
          </div>
        </section>
      )}
    </Show>
  );
}

function rowHandlers(props: DetailPanelProps) {
  return {
    onSelect: props.onSelect,
    onHover: props.onHover,
  };
}

interface RelationRowProps {
  entry: Entry;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

function RelationRow(props: RelationRowProps) {
  return (
    <li>
      <button
        type="button"
        class="relation"
        onClick={() => props.onSelect(props.entry.otherId)}
        onMouseEnter={() => props.onHover(props.entry.otherId)}
        onMouseLeave={() => props.onHover(null)}
        onFocus={() => props.onHover(props.entry.otherId)}
        onBlur={() => props.onHover(null)}
      >
        <span
          class="relation-dot"
          data-family={props.entry.family}
          data-dash={props.entry.dash}
        />
        <Avatar
          id={props.entry.otherId}
          name={props.entry.otherName}
          size={30}
        />
        <span>
          <span class="relation-verb">{props.entry.verb} </span>
          <span class="relation-name">{props.entry.otherName}</span>
          <Show when={props.entry.note}>
            {note => <span class="relation-note">{note()}</span>}
          </Show>
        </span>
      </button>
    </li>
  );
}
