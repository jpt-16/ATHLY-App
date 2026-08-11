import { describe, expect, it } from 'vitest';

import { S } from './styles';

describe('S', () => {
  it('parses a declaration string into a React style object', () => {
    expect(S('display:flex;align-items:center;gap:12px')).toEqual({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    });
  });

  it('camel-cases hyphenated properties but leaves custom properties alone', () => {
    expect(S('font-stretch:113%;--brand-ink:#111815')).toEqual({
      fontStretch: '113%',
      '--brand-ink': '#111815',
    });
  });

  it('keeps colons inside a value', () => {
    expect(S('background:linear-gradient(to top,#F4F2ED 62%,rgba(0,0,0,0))')).toEqual({
      background: 'linear-gradient(to top,#F4F2ED 62%,rgba(0,0,0,0))',
    });
  });

  it('splits on a semicolon inside a value, matching the design runtime', () => {
    // A known limitation carried over deliberately: declarations are split on
    // every `;`, so a `data:` URL would be cut short. No style in the app uses
    // one; if that changes, this parser needs to become paren/quote aware.
    expect(S('background:url(data:image/png;base64,AA)')).toEqual({
      background: 'url(data:image/png',
    });
  });

  it('tolerates trailing separators and blank declarations', () => {
    expect(S('color:#fff;;')).toEqual({ color: '#fff' });
  });

  it('passes objects through and treats nullish input as empty', () => {
    const obj = { color: 'red' };
    expect(S(obj)).toBe(obj);
    expect(S(null)).toEqual({});
    expect(S(undefined)).toEqual({});
  });

  it('returns the same object for the same string', () => {
    const css = 'position:absolute;inset:0';
    expect(S(css)).toBe(S(css));
  });
});
