/**
 * What a meal description turns into, before anything has been looked up.
 *
 * One shape, two producers. `simple.ts` gets here with a regex and no network;
 * an LLM gets here with a schema. Everything downstream — the nutrition lookup,
 * the preview, the edit sheet — works on this and never learns which one
 * answered. That is the whole point: the brief asks for the AI model to be
 * replaceable without rebuilding the app, and the way to earn that claim is to
 * have a second implementation behind the same interface from the start.
 */

export interface ParsedItem {
  /** What to search the nutrition database for: "eggs", "white bread toast". */
  query: string;
  /** As the athlete would recognise it, for the preview: "2 eggs". */
  label: string;
  quantity: number;
  /** "g", "oz", "slice", "cup", or "" for a bare count. */
  unit: string;
  /** Named by the athlete. Biases the search towards that manufacturer's row. */
  brand: string | null;
  /**
   * True when the parser is not confident it read this right.
   *
   * Shown to the athlete as an item worth checking, rather than silently
   * presented with the same authority as a scanned barcode. Ambiguity is a
   * thing to surface, not a thing to smooth over.
   */
  uncertain: boolean;
  /** Whether volume may be treated as mass. Drinks only — see `units.ts`. */
  liquid: boolean;
}

export interface ParseResult {
  items: ParsedItem[];
  /** Which parser answered, kept so the app can say so and so it can be graphed. */
  parser: 'rules' | 'llm';
  /** Anything the parser could not use, echoed back rather than dropped silently. */
  ignored: string[];
}

/** The interface both parsers satisfy. */
export interface MealParser {
  readonly name: 'rules' | 'llm';
  parse(text: string): Promise<ParseResult>;
}

/** Longest meal description accepted. Validated server-side, not just in the UI. */
export const MAX_TEXT_LENGTH = 500;
/** More items than any real meal, and a bound on what one request can cost. */
export const MAX_ITEMS = 12;
