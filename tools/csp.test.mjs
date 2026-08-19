import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildCsp, FRAME_ANCESTORS } from './csp.mjs';

/**
 * A Content-Security-Policy fails open. A directive with a typo in its name is
 * ignored rather than rejected, a missing `connect-src` falls back to whatever
 * `default-src` says, and either way the page renders perfectly and protects
 * nothing. There is no runtime symptom to notice, so these assertions are the
 * only thing standing between the policy and quiet uselessness.
 */

const PROJECT = 'https://vaubyuzjuowrongfbstk.supabase.co';

/** Directive → its source list, for a policy string. */
function directives(policy) {
  return Object.fromEntries(
    policy.split(';').map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

describe('buildCsp', () => {
  it('gives script nowhere to come from but this origin', () => {
    // The one that matters. The Supabase session sits in localStorage and
    // refreshes itself, so injected script is a durable copy of an account
    // rather than a defaced page.
    expect(directives(buildCsp(PROJECT))['script-src']).toEqual(["'self'"]);
  });

  it("never lets 'unsafe-inline' or 'unsafe-eval' near script", () => {
    const script = directives(buildCsp(PROJECT))['script-src'].join(' ');
    expect(script).not.toMatch(/unsafe-inline|unsafe-eval|unsafe-hashes/);
  });

  it('allows the configured project, over both https and the realtime socket', () => {
    const connect = directives(buildCsp(PROJECT))['connect-src'];
    expect(connect).toContain(PROJECT);
    expect(connect).toContain('wss://vaubyuzjuowrongfbstk.supabase.co');
  });

  it('names one project rather than every project', () => {
    // `https://*.supabase.co` — or the bare scheme `https:` — would permit
    // exfiltration to any Supabase project anyone can create in a minute, which
    // is the whole point of the directive gone. Every source must be a host.
    for (const source of directives(buildCsp(PROJECT))['connect-src']) {
      if (source === "'self'") continue;
      expect(source, source).not.toContain('*');
      expect(source, source).toMatch(/^(https|wss):\/\/[^*]+$/);
    }
  });

  it('reaches nothing at all in the local-only build', () => {
    // No backend configured, so no host to talk to. This is the bundle the
    // pixel-diff harness photographs.
    expect(directives(buildCsp(undefined))['connect-src']).toEqual(["'self'"]);
    expect(directives(buildCsp('  '))['connect-src']).toEqual(["'self'"]);
  });

  it('names the food database, and nothing wider', () => {
    // The barcode scanner reads Open Food Facts. Named explicitly for the same
    // reason the project origin is: a wildcard here would let injected script
    // post an athlete's data anywhere it liked.
    expect(directives(buildCsp(PROJECT))['connect-src']).toContain('https://world.openfoodfacts.org');
  });

  it('closes the escalation routes an injection would otherwise reach for', () => {
    const d = directives(buildCsp(PROJECT));
    for (const name of ['object-src', 'base-uri', 'form-action', 'frame-src']) {
      expect(d[name], name).toEqual(["'none'"]);
    }
  });

  it('has a default to fall back to', () => {
    // Any fetch directive not listed above inherits this rather than going
    // unrestricted — the difference between forgetting one and leaving it open.
    expect(directives(buildCsp(PROJECT))['default-src']).toEqual(["'self'"]);
  });
});

describe('frame-ancestors', () => {
  it('is set as a real header, because a meta policy is required to ignore it', () => {
    // The half of the policy that cannot live in the page. If this drifts out of
    // vercel.json, clickjacking rests on X-Frame-Options alone — which works,
    // but is no longer the specified way to say it.
    const vercel = JSON.parse(readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
    const headers = vercel.headers.flatMap((rule) => rule.headers);
    const csp = headers.find((h) => h.key === 'Content-Security-Policy');

    expect(csp?.value).toBe(FRAME_ANCESTORS);
    expect(buildCsp(PROJECT)).not.toContain('frame-ancestors');
  });

  it('travels with the transport headers that the rest of this assumes', () => {
    const vercel = JSON.parse(readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
    const keys = vercel.headers.flatMap((rule) => rule.headers).map((h) => h.key);

    // Without HSTS the first request on a hostile network is plain HTTP and can
    // be answered by anyone, which makes every other control here moot.
    expect(keys).toContain('Strict-Transport-Security');
    expect(keys).toContain('X-Content-Type-Options');
    expect(keys).toContain('X-Frame-Options');
  });
});

describe('the visual harness renders under this policy', () => {
  /**
   * The capture harness photographs the built page, so the policy applies to it
   * too — and that coupling is invisible from either file.
   *
   * It broke exactly once, silently: the harness stubbed Google Fonts with the
   * woff2 inlined as a `data:` URI, which had been fine for as long as there was
   * no policy. Adding `font-src 'self' https://fonts.gstatic.com` blocked it,
   * every capture aborted on the font assertion, and the visual gate stayed red
   * for two commits while looking like a pixel regression.
   */
  const captures = ['tools/visual/capture.mjs', 'tools/visual/capture-auth.mjs'];

  it.each(captures)('%s serves its stub font from an origin font-src allows', (file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8');
    const url = source.match(/const FONT_URL = '([^']+)'/)?.[1];
    expect(url, `${file} has no FONT_URL`).toBeTruthy();

    const fontSrc = buildCsp(PROJECT)
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('font-src '));
    expect(fontSrc).toBeTruthy();

    expect(fontSrc).toContain(new URL(url).origin);
  });

  it.each(captures)('%s does not inline a font the policy would block', (file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8');
    // `data:` is allowed for images and deliberately not for fonts.
    expect(buildCsp(PROJECT)).toContain("img-src 'self' data:");
    expect(source).not.toMatch(/src:url\(data:font/);
  });
});
