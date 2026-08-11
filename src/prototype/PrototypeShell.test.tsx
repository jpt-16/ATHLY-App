import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { App } from '../App';

/**
 * The two presentations of the shell. What matters is not the exact markup but
 * that the phone one draws no hardware: on a real device the OS supplies the
 * status bar and the home indicator, and drawing ours over them gives the user
 * two clocks and two home bars.
 */
function setViewport(compact: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: compact,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const frame = () => document.querySelector('[data-om-starter="ios-frame"]');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PrototypeShell', () => {
  it('draws the device frame and page chrome on a desktop viewport', () => {
    setViewport(false);
    render(<App />);

    expect(frame()).toBeInTheDocument();
    expect(screen.getByText(/interactive prototype/i)).toBeInTheDocument();
    // The frame's own status bar clock — present only when we draw the hardware.
    expect(screen.getByText('9:41')).toBeInTheDocument();
  });

  it('drops the frame, the chrome and the drawn status bar on a phone viewport', () => {
    setViewport(true);
    render(<App />);

    // The marker stays put in both modes — the visual harness keys off it.
    expect(frame()).toBeInTheDocument();
    expect(screen.queryByText(/interactive prototype/i)).not.toBeInTheDocument();
    expect(screen.queryByText('9:41')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's set you up/i })).toBeInTheDocument();
  });
});
