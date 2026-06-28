import { Component, Suspense, type ReactNode } from 'react';
import Character from './Character';
import CharacterModel from './CharacterModel';

// If public/character.glb is missing or fails to load, useGLTF throws — this
// boundary quietly falls back to the procedural figure so the app never breaks.
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function CharacterView() {
  return (
    <ModelBoundary fallback={<Character />}>
      <Suspense fallback={<Character />}>
        <CharacterModel />
      </Suspense>
    </ModelBoundary>
  );
}
