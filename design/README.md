# Design source

The design material this codebase was built from, kept as reference. Nothing
here is built, imported or served — the app in `src/` is the running version of
it. Treat these files as read-only history.

## `prototype/`

| File             | What it is                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ATHLY.dc.html`  | The original Claude Design prototype: one template plus one logic class, in the design tool's own format (`sc-if`, `sc-for`, `{{ }}` bindings). Every screen in `src/prototype/screens/` is a direct translation of a block in this file. |
| `ios-frame.jsx`  | The iOS 26 device frame the prototype rendered inside. Now `src/components/ios/IOSFrame.tsx`.                                                                                                                                             |
| `screenshot.png` | The prototype's own thumbnail, as delivered.                                                                                                                                                                                              |

The prototype cannot be opened on its own: it needs the design tool's runtime
(`support.js`), which loaded React and Babel from a CDN and interpreted the
template in the browser. That runtime is exactly what this repository replaces.

## `modernist-design-system/`

Modernist — the design system ATHLY's visual language was adapted from. Archivo
throughout, strong 2px rules, a visible grid, flat surfaces. ATHLY retunes it to
charcoal ink (`#111815`), a warm white ground (`#F4F2ED` on `#E8E5DE`) and a
restrained green accent (`#17A05E`).

`styles.css` carries the system's tokens. The app does not link it — the screens
were drawn with ATHLY's own retuned palette, held inline — but it is the
reference for what "on-system" means when new screens get designed.
