import type { CSSProperties } from 'react';

/**
 * Style strings repeat heavily across renders — most are literals baked into
 * the markup — so parsed results are memoised. The cache is cleared wholesale
 * once saturated; the working set re-warms within a render or two, and that is
 * cheaper than per-entry LRU bookkeeping.
 */
const MAX_CACHE = 4096;
const cache = new Map<string, CSSProperties>();

/**
 * Turn a CSS declaration string into a React style object.
 *
 * The ATHLY screens were authored as a Claude Design template, where every
 * element carries its style as a plain CSS string (`"display:flex;gap:12px"`)
 * and the view model hands back computed strings for anything dynamic. Keeping
 * that representation — rather than rewriting ~640 style attributes by hand —
 * is what lets the production build render pixel-for-pixel like the prototype.
 *
 * Parsing matches the design-tool runtime exactly: split on `;`, split each
 * declaration on its first `:`, camel-case the property unless it is a custom
 * property (`--x`).
 */
export function S(css: string | CSSProperties | null | undefined): CSSProperties {
  if (css == null) return EMPTY;
  if (typeof css !== 'string') return css;

  const hit = cache.get(css);
  if (hit) return hit;

  const style: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!prop) continue;
    style[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }

  const parsed = Object.freeze(style) as CSSProperties;
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(css, parsed);
  return parsed;
}

const EMPTY: CSSProperties = Object.freeze({});

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
