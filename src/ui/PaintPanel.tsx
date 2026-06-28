import { usePaintStore } from '../store/usePaintStore';
import { hexToHsv, hexToRgb, hsvToHex, rgbToHex } from '../utils/color';
import ColorWheel from './ColorWheel';

export default function PaintPanel() {
  const paintMode = usePaintStore((s) => s.paintMode);
  const tool = usePaintStore((s) => s.tool);
  const color = usePaintStore((s) => s.color);
  const brushSize = usePaintStore((s) => s.brushSize);
  const metalness = usePaintStore((s) => s.metalness);
  const roughness = usePaintStore((s) => s.roughness);
  const palette = usePaintStore((s) => s.palette);
  const { setTool, setColor, setBrushSize, setMetalness, setRoughness, addPaletteColor } = usePaintStore();

  if (!paintMode) return null;

  const rgb = hexToRgb(color);
  const hsv = hexToHsv(color);

  return (
    <div className="paint-panel">
      <div className="paint-panel-header">
        <span>BODY PAINT</span>
        <span className="paint-panel-hint">F to close · middle-mouse to rotate</span>
      </div>

      <div className="paint-tools-row">
        <button className={tool === 'brush' ? 'tool-btn tool-btn--active' : 'tool-btn'} onClick={() => setTool('brush')}>
          Brush
        </button>
        <button className={tool === 'eraser' ? 'tool-btn tool-btn--active' : 'tool-btn'} onClick={() => setTool('eraser')}>
          Eraser
        </button>
        <button
          className={tool === 'eyedropper' ? 'tool-btn tool-btn--active' : 'tool-btn'}
          onClick={() => setTool('eyedropper')}
          title="Click any surface in the scene to sample its color"
        >
          Eyedropper
        </button>
      </div>

      <div className="paint-row">
        <label>Brush size</label>
        <input type="range" min={0.02} max={0.35} step={0.01} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
      </div>

      <div className="paint-section">
        <ColorWheel
          hsv={hsv}
          onPick={(h, s) => setColor(hsvToHex({ h, s, v: hsv.v }))}
        />
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

      <div className="paint-section-label">HSV</div>
      <div className="slider-grid">
        <div className="paint-row">
          <label>H</label>
          <input type="range" min={0} max={360} value={hsv.h} onChange={(e) => setColor(hsvToHex({ ...hsv, h: Number(e.target.value) }))} />
          <span className="paint-row-value">{Math.round(hsv.h)}</span>
        </div>
        <div className="paint-row">
          <label>S</label>
          <input type="range" min={0} max={1} step={0.01} value={hsv.s} onChange={(e) => setColor(hsvToHex({ ...hsv, s: Number(e.target.value) }))} />
          <span className="paint-row-value">{Math.round(hsv.s * 100)}</span>
        </div>
        <div className="paint-row">
          <label>V</label>
          <input type="range" min={0} max={1} step={0.01} value={hsv.v} onChange={(e) => setColor(hsvToHex({ ...hsv, v: Number(e.target.value) }))} />
          <span className="paint-row-value">{Math.round(hsv.v * 100)}</span>
        </div>
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

      <div className="paint-section-label">Palette</div>
      <div className="palette-row">
        {palette.map((hex) => (
          <button
            key={hex}
            className={hex === color ? 'palette-swatch palette-swatch--active' : 'palette-swatch'}
            style={{ background: hex }}
            onClick={() => setColor(hex)}
          />
        ))}
        <button className="palette-swatch palette-swatch--add" onClick={() => addPaletteColor(color)} title="Save current color">
          +
        </button>
      </div>
    </div>
  );
}
