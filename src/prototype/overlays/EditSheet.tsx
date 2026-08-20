import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

/**
 * Changing one answer on the Profile screen.
 *
 * A sheet rather than a screen per field, and one sheet rather than eleven: the
 * fields differ only in what kind of input they need, so the descriptor in
 * `profileFields.ts` decides and this renders it. Adding a field is a row in
 * that file rather than a component.
 *
 * The hint is not decoration. Several of these answers move numbers on other
 * screens — age changes every micronutrient target, weight sets the floor the
 * calorie target cannot fall below — and an athlete who does not know that will
 * read the change as the app being unstable.
 */
export function EditSheet({ v }: { v: ViewModel }) {
  const input = (value: string, set: (next: string) => void, label: string, wide: boolean) => (
    <input
      type={v.editKind === 'text' ? 'text' : 'number'}
      inputMode={v.editKind === 'text' ? 'text' : 'decimal'}
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      autoFocus={wide}
      style={S(
        `${wide ? 'flex:1' : 'width:96px'};min-width:0;padding:14px 15px;border-radius:13px;border:2px solid rgba(17,24,21,.12);font-size:17px;font-weight:800;font-family:inherit;background:#fff;color:#111815`,
      )}
    />
  );

  return (
    <>
      <div
        style={S(
          'position:absolute;inset:0;z-index:60;background:rgba(17,24,21,.5);animation:ffFade .2s ease',
        )}
        onClick={v.editCancel}
      />
      <div
        style={S(
          'position:absolute;left:0;right:0;bottom:0;z-index:61;background:#F4F2ED;border-radius:24px 24px 0 0;padding:22px 22px calc(24px + env(safe-area-inset-bottom, 0px));animation:ffUp .34s cubic-bezier(.2,.85,.25,1)',
        )}
      >
        <div
          style={S(
            'width:38px;height:4px;border-radius:99px;background:rgba(17,24,21,.16);margin:0 auto 18px',
          )}
        />
        <h2 style={S('margin:0 0 6px;font-size:21px;font-weight:900;letter-spacing:-.02em')}>
          {v.editTitle}
        </h2>
        {v.editHint ? (
          <p style={S('margin:0 0 16px;font-size:13px;line-height:1.5;color:#6E6A60')}>{v.editHint}</p>
        ) : (
          <div style={S('height:10px')} />
        )}

        {v.editKind === 'choice' ? (
          <div style={S('display:flex;flex-wrap:wrap;gap:8px')}>
            {(v.editOptions ?? []).map((o: VmRow, i: number) => (
              <React.Fragment key={i}>
                <button onClick={o.pick} style={S(o.style)}>
                  {o.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        ) : v.editKind === 'height' ? (
          <div style={S('display:flex;align-items:center;gap:10px')}>
            {input(v.editValue, v.setEditValue, 'Feet', false)}
            <span style={S('font-size:14px;font-weight:800;color:#6E6A60')}>ft</span>
            {input(v.editValue2, v.setEditValue2, 'Inches', false)}
            <span style={S('font-size:14px;font-weight:800;color:#6E6A60')}>in</span>
          </div>
        ) : (
          <div style={S('display:flex;align-items:center;gap:10px')}>
            {input(v.editValue, v.setEditValue, v.editTitle, true)}
            {v.editUnit ? (
              <span style={S('font-size:14px;font-weight:800;color:#6E6A60;flex:none')}>{v.editUnit}</span>
            ) : null}
          </div>
        )}

        <div style={S('display:flex;gap:9px;margin-top:20px')}>
          <button
            onClick={v.editCancel}
            style={S(
              'padding:14px 20px;border-radius:13px;border:2px solid rgba(17,24,21,.12);background:#fff;font-size:14px;font-weight:800;flex:none',
            )}
          >
            Cancel
          </button>
          <button
            onClick={v.editSave}
            style={S(
              'flex:1;padding:14px;border-radius:13px;background:#111815;color:#F4F2ED;font-size:14px;font-weight:800',
            )}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
