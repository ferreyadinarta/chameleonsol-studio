import type * as THREE from 'three';
import { useStageStore } from '../store/useStageStore';
import { usePoseStore } from '../store/usePoseStore';

// One shared, chronological undo stack for both paint strokes and character
// transform/pose changes, so Ctrl+Z always undoes whatever happened most
// recently regardless of which kind of action it was.

export type PaintGesture = Map<THREE.Mesh, { albedo: ImageData; orm: ImageData }>;

export type CharacterSnapshot = {
  charX: number;
  charY: number;
  charZ: number;
  charRotY: number;
  charScale: number;
  lockedPoseId: string;
};

export type UndoEntry = { kind: 'paint'; gesture: PaintGesture } | { kind: 'character'; prev: CharacterSnapshot };

const UNDO_LIMIT = 20;
const stack: UndoEntry[] = [];

export function pushUndo(entry: UndoEntry) {
  stack.push(entry);
  if (stack.length > UNDO_LIMIT) stack.shift();
}

export function popUndo(): UndoEntry | undefined {
  return stack.pop();
}

// A full paint "Clear" invalidates in-flight paint-gesture snapshots (they'd
// restore old paint on top of freshly blanked canvases), but character moves
// are unrelated — leave those undo entries in place.
export function clearPaintUndo() {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].kind === 'paint') stack.splice(i, 1);
  }
}

export function snapshotCharacter(): CharacterSnapshot {
  const s = useStageStore.getState();
  return {
    charX: s.charX,
    charY: s.charY,
    charZ: s.charZ,
    charRotY: s.charRotY,
    charScale: s.charScale,
    lockedPoseId: usePoseStore.getState().lockedPoseId,
  };
}

function characterEqual(a: CharacterSnapshot, b: CharacterSnapshot): boolean {
  return (
    a.charX === b.charX &&
    a.charY === b.charY &&
    a.charZ === b.charZ &&
    a.charRotY === b.charRotY &&
    a.charScale === b.charScale &&
    a.lockedPoseId === b.lockedPoseId
  );
}

// Call with the snapshot taken BEFORE a move/rotate/pose-change session — a
// no-op if nothing actually ended up different (e.g. a key tap that hit a
// bound and moved nothing), so undo doesn't accumulate empty steps.
export function pushCharacterUndo(prev: CharacterSnapshot) {
  if (characterEqual(prev, snapshotCharacter())) return;
  pushUndo({ kind: 'character', prev });
}
