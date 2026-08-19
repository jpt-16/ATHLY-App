import { S } from '../styles';

/**
 * Any time the quick picks do not cover.
 *
 * `<input type="time">` rather than a hand-built wheel, because iOS already has
 * one and it is the one an athlete's thumb expects — the same control every
 * other app on the phone uses to ask this question. It also brings the keyboard
 * path and VoiceOver support for free, neither of which a div dressed as a
 * spinner would have.
 *
 * Rendered as the last item in the row of chips, so the common answers stay one
 * tap away and this is what you reach for when your practice starts at 5:45.
 */
export function TimePicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <label
      style={S(
        'display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:11px;border:2px solid rgba(17,24,21,.12);background:#fff;flex:none;white-space:nowrap;cursor:pointer',
      )}
    >
      <span
        style={S(
          'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779',
        )}
      >
        Other
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pick another time"
        style={S(
          'font-size:13px;font-weight:800;color:#111815;background:transparent;border:none;padding:0;font-family:inherit;min-width:78px',
        )}
      />
    </label>
  );
}
