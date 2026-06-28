import { useState } from 'react';
import { usePaintStore, type PaintTool } from '../store/usePaintStore';
import { hexToHsv, hexToRgb, hsvToHex, rgbToHex } from '../utils/color';
import ColorWheel from './ColorWheel';

function ToolIcon({ tool }: { tool: PaintTool }) {
  if (tool === 'brush') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 3.5 19 6l-9.5 9.5-3.5 1 1-3.5L16.5 3.5z" />
        <path d="M4 20l1-3 3 3-1 1z" />
      </svg>
    );
  }
  if (tool === 'eraser') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l7-7 8 8-4 3H8l-5-4z" />
        <path d="M10 10l6-6 5 5-6 6" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3l2 2-5 5-2-2 5-5z" />
      <path d="M14 8l-8 8-2 5 5-2 8-8z" />
    </svg>
  );
}

export default function PaintPanel() {
  const paintMode = usePaintStore((s) => s.paintMode);
  const tool = usePaintStore((s) => s.tool);
  const color = usePaintStore((s) => s.color);
  const brushSize = usePaintStore((s) => s.brushSize);
  const metalness = usePaintStore((s) => s.metalness);
  const roughness = usePaintStore((s) => s.roughness);
  const palette = usePaintStore((s) => s.palette);
  const { setTool, setColor, setBrushSize, setMetalness, setRoughness, addPaletteColor, requestUndo, requestClear, requestSave } =
    usePaintStore();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!paintMode) return null;

  const rgb = hexToRgb(color);
  const hsv = hexToHsv(color);

  return (
    <>
      {advancedOpen && (
        <div className="paint-advanced">
          <div className="paint-advanced-header">
            <span>COLOR</span>
            <button className="paint-advanced-close" onClick={() => setAdvancedOpen(false)}>
              ×
            </button>
          </div>
          <div className="paint-section">
            <ColorWheel hsv={hsv} onPick={(h, s) => setColor(hsvToHex({ h, s, v: hsv.v }))} />
            <div className="value-slider">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={hsv.v}
                onChange={(e) => setColor(hsvToHex({ h: hsv.h, s: hsv.s, v: Number(e.target.value) }))}
              />
            </div>
            <div className="swatch-preview" style={{ background: color }} />
          </div>

          <div className="paint-section-label">RGB</div>
          <div className="slider-grid">
            {(['r', 'g', 'b'] as const).map((channel) => (
              <div className="paint-row" key={channel}>
                <label>{channel.toUpperCase()}</label>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={rgb[channel]}
                  onChange={(e) => setColor(rgbToHex({ ...rgb, [channel]: Number(e.target.value) }))}
                />
                <span className="paint-row-value">{Math.round(rgb[channel])}</span>
              </div>
            ))}
          </div>

          <div className="paint-section-label">Material</div>
          <div className="paint-row">
            <label>Metallic</label>
            <input type="range" min={0} max={1} step={0.01} value={metalness} onChange={(e) => setMetalness(Number(e.target.value))} />
            <span className="paint-row-value">{Math.round(metalness * 100)}</span>
          </div>
          <div className="paint-row">
            <label>Roughness</label>
            <input type="range" min={0} max={1} step={0.01} value={roughness} onChange={(e) => setRoughness(Number(e.target.value))} />
            <span className="paint-row-value">{Math.round(roughness * 100)}</span>
          </div>
        </div>
      )}

      <div className="paint-toolbar">
        <div className="paint-toolbar-group">
          {(['brush', 'eraser', 'eyedropper'] as PaintTool[]).map((t) => (
            <button
              key={t}
              className={tool === t ? 'icon-btn icon-btn--active' : 'icon-btn'}
              onClick={() => setTool(t)}
              title={t}
            >
              <ToolIcon tool={t} />
            </button>
          ))}
        </div>

        <div className="paint-toolbar-divider" />

        <div className="paint-toolbar-group">
          <button
            className="color-btn color-btn--current"
            style={{ background: color }}
            onClick={() => setAdvancedOpen((o) => !o)}
            title="Edit color"
          />
          {palette.map((hex) => (
            <button
              key={hex}
              className={hex === color ? 'color-btn color-btn--active' : 'color-btn'}
              style={{ background: hex }}
              onClick={() => setColor(hex)}
            />
          ))}
          <button className="color-btn color-btn--add" onClick={() => addPaletteColor(color)} title="Save current color">
            +
          </button>
        </div>

        <div className="paint-toolbar-divider" />

        <div className="paint-toolbar-size">
          <label>Size</label>
          <input type="range" min={0.02} max={0.35} step={0.01} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
        </div>

        <div className="paint-toolbar-divider" />

        <div className="paint-toolbar-group">
          <button className="text-btn" onClick={requestUndo}>
            Undo
          </button>
          <button className="text-btn" onClick={requestClear}>
            Clear
          </button>
          <button className="text-btn text-btn--accent" onClick={requestSave}>
            Save
          </button>
        </div>
      </div>
    </>
  );
}
