import { useState } from "react";

type Active = "left" | "right" | "middle" | "scroll";

function MouseIcon({ active }: { active: Active }) {
  return (
    <svg
      className="ctrl-mouse"
      width="24"
      height="32"
      viewBox="0 0 24 32"
      fill="none"
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="28"
        rx="10"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="13"
        stroke="currentColor"
        strokeWidth="1"
      />
      <line
        x1="2.5"
        y1="13"
        x2="21.5"
        y2="13"
        stroke="currentColor"
        strokeWidth="1"
      />
      {active === "left" && (
        <path d="M12 3 H7 A9 9 0 0 0 2.6 12.5 H12 Z" className="ctrl-fill" />
      )}
      {active === "right" && (
        <path d="M12 3 H17 A9 9 0 0 1 21.4 12.5 H12 Z" className="ctrl-fill" />
      )}
      {active === "middle" && (
        <rect
          x="10.5"
          y="5"
          width="3"
          height="8"
          rx="1.5"
          className="ctrl-fill"
        />
      )}
      {active === "scroll" && (
        <rect x="10" y="6" width="4" height="7" rx="2" className="ctrl-fill" />
      )}
    </svg>
  );
}

function Key({ children }: { children: string }) {
  return <kbd className="ctrl-key">{children}</kbd>;
}

export default function ControlsHint() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={open ? "controls-hint" : "controls-hint controls-hint--closed"}
    >
      <button
        className="controls-hint-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Controls"
      >
        {open ? "✕" : "?"}
      </button>
      {open && (
        <div className="controls-hint-rows">
          <div className="controls-hint-row">
            <MouseIcon active="left" />
            <span>
              <strong>Drag</strong> — Rotate figure
            </span>
          </div>
          <div className="controls-hint-row">
            <MouseIcon active="right" />
            <span>
              <strong>Right + Drag</strong> — Camera angle
            </span>
          </div>
          <div className="controls-hint-row">
            <MouseIcon active="left" />
            <span>
              <strong>Shift + Drag</strong> — Pan view
            </span>
          </div>
          <div className="controls-hint-row">
            <MouseIcon active="scroll" />
            <span>
              <strong>Scroll</strong> — Zoom (whole scene)
            </span>
          </div>
          <div className="controls-hint-divider" />
          <div className="controls-hint-row controls-hint-row--keys">
            <span className="ctrl-keys">
              <Key>W</Key>
              <Key>A</Key>
              <Key>S</Key>
              <Key>D</Key>
            </span>
            <span>Move figure (left, right, up, down)</span>
          </div>
          <div className="controls-hint-row controls-hint-row--keys">
            <span className="ctrl-keys">
              <Key>Q</Key>
              <Key>E</Key>
            </span>
            <span>Move figure depth (near/far)</span>
          </div>
        </div>
      )}
    </div>
  );
}
