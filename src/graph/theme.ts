export interface Theme {
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  kinship: string;
  mentorship: string;
  devotion: string;
  nodeLow: string;
  nodeHigh: string;
  nodeRing: string;
  edgeIdle: string;
}

const TOKENS: Record<keyof Theme, string> = {
  surface: '--surface-1',
  border: '--border',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  kinship: '--kinship',
  mentorship: '--mentorship',
  devotion: '--devotion',
  nodeLow: '--node-low',
  nodeHigh: '--node-high',
  nodeRing: '--node-ring',
  edgeIdle: '--edge-idle',
};

export function readTheme(element: Element): Theme {
  const styles = getComputedStyle(element);
  const theme = {} as Theme;
  for (const key of Object.keys(TOKENS) as (keyof Theme)[]) {
    theme[key] = styles.getPropertyValue(TOKENS[key]).trim() || '#888888';
  }
  return theme;
}

/** Fires whenever the OS scheme flips or the `data-theme` stamp changes. */
export function watchTheme(onChange: () => void): () => void {
  const media = globalThis.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);

  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => {
    media.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map(c => c + c)
          .join('')
      : value;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** Straight sRGB mix — the ramp ends are close enough in hue for it to hold. */
export function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const clamped = Math.min(1, Math.max(0, t));
  const channel = (i: number) =>
    Math.round(a[i] + (b[i] - a[i]) * clamped)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${r} ${g} ${b} / ${Math.round(alpha * 100)}%)`;
}
