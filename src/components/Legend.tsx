import { For, Show } from 'solid-js';
import type { RelationFamily, RelationType } from '../data/types';
import { FAMILY_LABELS, RELATION_STYLES } from '../data/types';

const FAMILY_VAR: Record<RelationFamily, string> = {
  kinship: 'var(--kinship)',
  mentorship: 'var(--mentorship)',
  devotion: 'var(--devotion)',
};

const LABELS: Record<RelationType, string> = {
  parent: 'parent of',
  adopted: 'took in',
  sibling: 'sibling of',
  romantic: 'partnered with',
  taught: 'trained',
  influenced: 'influenced',
  saved: 'saved',
  loyalty: 'sworn to',
};

const FAMILIES: { family: RelationFamily; types: RelationType[] }[] = [
  { family: 'kinship', types: ['parent', 'adopted', 'sibling', 'romantic'] },
  { family: 'mentorship', types: ['taught', 'influenced'] },
  { family: 'devotion', types: ['saved', 'loyalty'] },
];

const DASH_ARRAY: Record<string, string> = {
  solid: '',
  dashed: '5 4',
  dotted: '0.5 3.5',
};

export interface LegendProps {
  open: boolean;
  onToggle: () => void;
}

export function Legend(props: LegendProps) {
  return (
    <div class="legend-dock">
      <Show when={props.open}>
        <aside class="legend">
          <For each={FAMILIES}>
            {group => (
              <>
                <h2>{FAMILY_LABELS[group.family]}</h2>
                <ul>
                  <For each={group.types}>
                    {type => (
                      <li>
                        <svg width="34" height="10" aria-hidden="true">
                          <line
                            x1="1"
                            y1="5"
                            x2={RELATION_STYLES[type].directed ? '25' : '33'}
                            y2="5"
                            stroke={FAMILY_VAR[group.family]}
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-dasharray={
                              DASH_ARRAY[RELATION_STYLES[type].dash]
                            }
                          />
                          {RELATION_STYLES[type].directed ? (
                            <path
                              d="M25 1 L33 5 L25 9 Z"
                              fill={FAMILY_VAR[group.family]}
                            />
                          ) : null}
                        </svg>
                        <span>{LABELS[type]}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </>
            )}
          </For>
          <div class="legend-scale">
            <svg width="46" height="18" aria-hidden="true">
              <circle cx="5" cy="9" r="3" fill="var(--node-low)" />
              <circle
                cx="19"
                cy="9"
                r="5"
                fill="var(--node-high)"
                opacity="0.55"
              />
              <circle cx="37" cy="9" r="8" fill="var(--node-high)" />
            </svg>
            <span>Size: reach across the cast</span>
          </div>
        </aside>
      </Show>
      <button
        type="button"
        class="legend-toggle"
        aria-expanded={props.open ? 'true' : 'false'}
        onClick={() => props.onToggle()}
      >
        {props.open ? 'Hide legend' : 'Legend'}
      </button>
    </div>
  );
}
