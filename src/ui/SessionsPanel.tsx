import { useEffect, useState } from 'react';
import { usePoseStore } from '../store/usePoseStore';
import { usePaintStore } from '../store/usePaintStore';
import { useStageStore } from '../store/useStageStore';
import { serializePaintState, restorePaintState } from '../three/PaintablePart';
import { listSessions, saveSession, deleteSession, type SessionRecord } from '../utils/sessionsDB';

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function SessionsPanel({ captureRef }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = () => listSessions().then(setSessions).catch(() => setSessions([]));

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleSave = async () => {
    const name = window.prompt('Name this session:', `Session ${new Date().toLocaleString()}`);
    if (name === null) return;
    setBusy(true);
    try {
      const stage = useStageStore.getState();
      const paint = usePaintStore.getState();
      const pose = usePoseStore.getState();
      const rec: SessionRecord = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled',
        updatedAt: Date.now(),
        thumbnail: captureRef.current?.() ?? null,
        data: {
          bgImage: stage.bgImage,
          charX: stage.charX,
          charY: stage.charY,
          charZ: stage.charZ,
          charRotY: stage.charRotY,
          lockedPoseId: pose.lockedPoseId,
          color: paint.color,
          palette: paint.palette,
          paint: serializePaintState(),
        },
      };
      await saveSession(rec);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (rec: SessionRecord) => {
    setBusy(true);
    try {
      const d = rec.data;
      useStageStore.getState().loadStage({
        bgImage: d.bgImage,
        charX: d.charX,
        charY: d.charY,
        charZ: d.charZ,
        charRotY: d.charRotY,
      });
      usePoseStore.getState().setLockedPose(d.lockedPoseId);
      usePaintStore.getState().setPalette(d.palette);
      usePaintStore.getState().setColor(d.color);
      await restorePaintState(d.paint);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    await refresh();
  };

  return (
    <>
      <button className="sessions-open-btn" onClick={() => setOpen(true)}>
        Sessions
      </button>

      {open && (
        <div className="pfp-modal-overlay" onClick={() => setOpen(false)}>
          <div className="sessions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sessions-modal-head">
              <span>SESSIONS</span>
              <button className="pfp-modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <button className="save-pfp-btn sessions-save" disabled={busy} onClick={handleSave}>
              {busy ? 'Working…' : '+ Save current session'}
            </button>

            <div className="sessions-list">
              {sessions.length === 0 && <div className="gallery-empty">No saved sessions yet.</div>}
              {sessions.map((s) => (
                <div className="session-item" key={s.id}>
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt="" className="session-thumb" onClick={() => handleLoad(s)} />
                  ) : (
                    <div className="session-thumb session-thumb--empty" onClick={() => handleLoad(s)} />
                  )}
                  <div className="session-meta">
                    <span className="session-name">{s.name}</span>
                    <span className="session-date">{new Date(s.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="session-actions">
                    <button className="stage-btn" disabled={busy} onClick={() => handleLoad(s)}>
                      Load
                    </button>
                    <button className="stage-btn" onClick={() => handleDelete(s.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
