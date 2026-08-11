import type { AthlyApp } from './AthlyApp';

/**
 * The flat bag of values every screen renders against.
 *
 * It is inferred straight from `AthlyApp.renderVals()`, so the screens and the
 * component that feeds them can never drift apart: rename a key in the logic
 * and every screen that reads it fails to compile.
 */
export type ViewModel = ReturnType<AthlyApp['renderVals']>;

/**
 * A single row inside the view model — one meal, one chip, one calendar cell.
 *
 * Rows are built ad hoc by `renderVals`, each carrying whatever the markup that
 * consumes it needs (a label, a click handler, a pre-computed style string).
 * Naming that per-row shape would mean ~40 near-identical interfaces for no
 * added safety, so rows stay dynamic while the top-level keys stay checked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VmRow = any;
