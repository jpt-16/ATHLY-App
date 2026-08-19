import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

import { isNative } from '../lib/platform';

/**
 * Opening the camera to read a barcode.
 *
 * A thin wrapper, and worth having for two reasons. It keeps the plugin out of
 * `AthlyApp`, which has no business knowing what a Capacitor plugin is; and it
 * turns every way this can end into a value the caller must handle, rather than
 * a mix of return values and exceptions. Someone declining the camera and
 * someone scanning a tin of beans need different sentences, and the difference
 * should not depend on remembering to catch.
 */
export type ScanOutcome =
  | { kind: 'code'; value: string }
  /** Backed out of the scanner. Say nothing; they know what they did. */
  | { kind: 'cancelled' }
  /** No camera to open — the browser build. */
  | { kind: 'unavailable' }
  /** Camera permission refused, which only Settings can undo. */
  | { kind: 'denied' };

export async function scanBarcode(): Promise<ScanOutcome> {
  if (!isNative) return { kind: 'unavailable' };

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    // `limited` is the photo-library grant and means nothing here; anything
    // short of a full grant cannot open a live camera.
    if (camera !== 'granted') return { kind: 'denied' };

    const { barcodes } = await BarcodeScanner.scan();
    const value = barcodes[0]?.rawValue?.trim();
    return value ? { kind: 'code', value } : { kind: 'cancelled' };
  } catch {
    // The plugin throws on cancel as well as on genuine failure, and it does not
    // distinguish them. Treating both as cancelled is the safe read: the
    // alternative is an error message every time somebody changes their mind.
    return { kind: 'cancelled' };
  }
}
