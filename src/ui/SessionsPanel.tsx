import { useEffect, useRef, useState } from 'react';
import { usePoseStore } from '../store/usePoseStore';
import { usePaintStore } from '../store/usePaintStore';
import { useStageStore } from '../store/useStageStore';
import { serializePaintState, restorePaintState } from '../three/PaintablePart';
import { getCameraState, applyCameraState } from '../three/cameraRig';
import { listSessions, saveSession, deleteSession, type SessionRecord } from '../utils/sessionsDB';

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function SessionsPanel({ captureRef }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = () => listSessions().then(setSessions).catch(() => setSessions([]));

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  // Ctrl/Cmd+S saves the current session directly — no need to open the
  // panel first, matching the save shortcut every other creative tool has.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault(); // stop the browser's native "save page" dialog
      handleSaveRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          charScale: stage.charScale,
          lockedPoseId: pose.lockedPoseId,
          color: paint.color,
          palette: paint.palette,
          paint: serializePaintState(),
          camera: getCameraState(),
        },
      };
      await saveSession(rec);
      await refresh();
      setOpen(true); // surface the panel so the new entry is visible as confirmation
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

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
        charScale: d.charScale,
      });
      usePoseStore.getState().setLockedPose(d.lockedPoseId);
      usePaintStore.getState().setPalette(d.palette);
      usePaintStore.getState().setColor(d.color);
      applyCameraState(d.camera);
      setOpen(false);
      await restorePaintState(d.paint);
    } catch (err) {
      console.error('[Sessions] load failed', err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setConfirmId(null);
    await refresh();
  };

  return (
    <>
      <button className="sessions-open-btn" title="Sessions (Ctrl/Cmd+S to save)" onClick={() => setOpen(true)}>
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

            <button
              className="save-pfp-btn sessions-save"
              disabled={busy}
              title="Ctrl/Cmd+S"
              onClick={handleSave}
            >
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
                    {confirmId === s.id ? (
                      <>
                        <button className="stage-btn stage-btn--danger" onClick={() => handleDelete(s.id)}>
                          Confirm
                        </button>
                        <button className="stage-btn" onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="stage-btn stage-btn--primary" disabled={busy} onClick={() => handleLoad(s)}>
                          Load
                        </button>
                        <button className="stage-btn" onClick={() => setConfirmId(s.id)}>
                          Delete
                        </button>
                      </>
                    )}
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
