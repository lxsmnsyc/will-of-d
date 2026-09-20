import { PORTRAIT_IDS } from '../data/portraits';

type Entry = { image: HTMLImageElement; ready: boolean } | 'failed';

const cache = new Map<string, Entry>();
let notify: (() => void) | null = null;

/** The canvas registers here so a late-arriving image triggers a redraw. */
export function onPortraitLoaded(callback: (() => void) | null): void {
  notify = callback;
}

export function hasPortrait(id: string): boolean {
  return PORTRAIT_IDS.has(id);
}

export function portraitUrl(id: string): string {
  return `${import.meta.env.BASE_URL}portraits/${id}.webp`;
}

/**
 * Returns the decoded image, or null while it is still loading, missing or
 * broken. Loading starts on the first call, so a node only pays for its
 * portrait once it is drawn large enough to show one.
 */
export function getPortrait(id: string): HTMLImageElement | null {
  if (!PORTRAIT_IDS.has(id)) return null;

  const cached = cache.get(id);
  if (cached === 'failed') return null;
  if (cached) return cached.ready ? cached.image : null;

  const image = new Image();
  const entry: Entry = { image, ready: false };
  cache.set(id, entry);

  image.addEventListener('load', () => {
    entry.ready = true;
    notify?.();
  });
  image.addEventListener('error', () => {
    cache.set(id, 'failed');
  });
  image.src = portraitUrl(id);

  return null;
}

/** Two letters at most, skipping the "D." that half the cast carries. */
export function initials(name: string): string {
  const parts = name
    .split(/[\s.]+/)
    .filter(part => part.length > 1 || /[A-Za-z]/.test(part))
    .filter(part => part.toUpperCase() !== 'D');
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
