// Lets the eyedropper sample colors from the uploaded background image, which
// is a flat HTML backdrop (not a 3D object the raycaster can hit).

let srcCanvas: HTMLCanvasElement | null = null;
let srcCtx: CanvasRenderingContext2D | null = null;
let currentUrl: string | null = null;

export function ensureBgSampler(url: string | null): void {
  if (url === currentUrl) return;
  currentUrl = url;
  srcCanvas = null;
  srcCtx = null;
  if (!url) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    srcCanvas = c;
    srcCtx = ctx;
  };
  img.src = url;
}

// Map a client point over the stage to the source pixel (object-fit: contain).
export function sampleBgAt(clientX: number, clientY: number, rect: DOMRect): string | null {
  if (!srcCanvas || !srcCtx) return null;
  const IW = srcCanvas.width;
  const IH = srcCanvas.height;
  const scale = Math.min(rect.width / IW, rect.height / IH);
  const dw = IW * scale;
  const dh = IH * scale;
  const ox = (rect.width - dw) / 2;
  const oy = (rect.height - dh) / 2;
  const px = Math.floor((clientX - rect.left - ox) / scale);
  const py = Math.floor((clientY - rect.top - oy) / scale);
  if (px < 0 || py < 0 || px >= IW || py >= IH) return null;
  const d = srcCtx.getImageData(px, py, 1, 1).data;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(d[0])}${hex(d[1])}${hex(d[2])}`;
}
