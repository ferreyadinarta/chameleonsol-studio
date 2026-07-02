import * as THREE from 'three';
import { photoBoardRig } from './photoBoardRig';

const WATERMARK_TEXT = 'Made with ChameleonSol';

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fontSize = Math.max(12, Math.round(w * 0.024));
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  const pad = fontSize * 0.9;
  // soft dark shadow so the mark reads on any underlying color
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = fontSize * 0.4;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillText(WATERMARK_TEXT, w - pad, h - pad);
  ctx.restore();
}

const _corner = new THREE.Vector3();

// A saved PFP should look like "the reference photo, with the painted
// character standing in it" — not a screenshot of the whole 3D viewport
// (walls, empty canvas margin, etc). When a backdrop board is present, crop
// tightly to its actual on-screen rectangle at capture time; otherwise (no
// background set) fall back to the full canvas.
export function capturePfp(gl: THREE.WebGLRenderer, camera: THREE.Camera): string {
  const glCanvas = gl.domElement;
  const board = photoBoardRig.group;
  const { width: boardW, height: boardH } = photoBoardRig;

  const out = document.createElement('canvas');
  let ctx: CanvasRenderingContext2D;

  if (board && boardW > 0 && boardH > 0) {
    const corners: [number, number][] = [
      [-boardW / 2, -boardH / 2],
      [boardW / 2, -boardH / 2],
      [boardW / 2, boardH / 2],
      [-boardW / 2, boardH / 2],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of corners) {
      _corner.set(x, y, 0).applyMatrix4(board.matrixWorld).project(camera);
      const px = (_corner.x * 0.5 + 0.5) * glCanvas.width;
      const py = (1 - (_corner.y * 0.5 + 0.5)) * glCanvas.height;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    // a little breathing room around the tight board edge
    const marginX = (maxX - minX) * 0.04;
    const marginY = (maxY - minY) * 0.04;
    minX = Math.max(0, minX - marginX);
    minY = Math.max(0, minY - marginY);
    maxX = Math.min(glCanvas.width, maxX + marginX);
    maxY = Math.min(glCanvas.height, maxY + marginY);

    const cropW = Math.max(1, Math.round(maxX - minX));
    const cropH = Math.max(1, Math.round(maxY - minY));
    out.width = cropW;
    out.height = cropH;
    ctx = out.getContext('2d')!;
    ctx.drawImage(glCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  } else {
    out.width = glCanvas.width;
    out.height = glCanvas.height;
    ctx = out.getContext('2d')!;
    ctx.drawImage(glCanvas, 0, 0);
  }

  drawWatermark(ctx, out.width, out.height);
  return out.toDataURL('image/png');
}
