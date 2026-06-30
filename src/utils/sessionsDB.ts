import type { PaintSnapshot } from '../three/PaintablePart';
import type { CameraState } from '../three/cameraRig';

// Saved sessions live in IndexedDB (not localStorage) because paint canvases +
// background images are large data URLs that would blow the 5 MB localStorage cap.

export type SessionData = {
  bgImage: string | null;
  charX: number;
  charY: number;
  charZ: number;
  charRotY: number;
  charScale?: number;
  lockedPoseId: string;
  color: string;
  palette: string[];
  paint: PaintSnapshot;
  camera?: CameraState | null;
};

export type SessionRecord = {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail: string | null;
  data: SessionData;
};

const DB_NAME = 'chameleonsol';
const STORE = 'sessions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSessions(): Promise<SessionRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as SessionRecord[]).sort((a, b) => b.updatedAt - a.updatedAt));
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(rec: SessionRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
