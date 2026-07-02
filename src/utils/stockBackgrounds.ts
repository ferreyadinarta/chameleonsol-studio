// Simple built-in backgrounds the user can try without uploading their own —
// just flat images (like a painting or photo), the same as an upload. Drawn
// as inline SVG so there's no asset file to ship or fetch.
export type StockBg = { id: string; label: string; swatch: string; url: string };

const svgUrl = (body: string, w = 800, h = 600) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}`;

export const STOCK_BACKGROUNDS: StockBg[] = [
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: 'linear-gradient(180deg, #e8834f 0%, #f4b860 45%, #cf8a4a 100%)',
    url: svgUrl(`
      <rect width="800" height="600" fill="#f4b860"/>
      <rect width="800" height="600" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8834f"/>
        <stop offset="45%" stop-color="#f4c877"/>
        <stop offset="100%" stop-color="#8a5a3a"/>
      </linearGradient></defs>
      <circle cx="400" cy="330" r="90" fill="#fbe3a1"/>
      <rect y="420" width="800" height="180" fill="#5b4632"/>
    `),
  },
  {
    id: 'studio',
    label: 'Studio',
    swatch: 'linear-gradient(180deg, #d9d4c8 60%, #b7b2a6 100%)',
    url: svgUrl(`
      <rect width="800" height="600" fill="#e4dfd2"/>
      <rect width="800" height="600" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e9e4d8"/>
        <stop offset="70%" stop-color="#cfc9bb"/>
        <stop offset="100%" stop-color="#a9a394"/>
      </linearGradient></defs>
    `),
  },
  {
    id: 'gallery',
    label: 'Gallery',
    swatch: 'linear-gradient(135deg, #e9e4d8 55%, #2c2a26 55%, #2c2a26 62%, #e4715a 62%)',
    url: svgUrl(`
      <rect width="800" height="600" fill="#efe9db"/>
      <rect y="440" width="800" height="160" fill="#c8bfa8"/>
      <rect x="240" y="120" width="320" height="240" fill="#2c2a26"/>
      <rect x="260" y="140" width="280" height="200" fill="#e4715a"/>
      <rect x="320" y="190" width="90" height="90" fill="#e9c46a"/>
      <circle cx="470" cy="220" r="40" fill="#264653"/>
    `),
  },
  {
    id: 'sky',
    label: 'Sky',
    swatch: 'linear-gradient(180deg, #bfe0f0 0%, #eaf6fb 60%, #d8e6c9 100%)',
    url: svgUrl(`
      <rect width="800" height="600" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a9d3ea"/>
        <stop offset="60%" stop-color="#eaf6fb"/>
        <stop offset="100%" stop-color="#cfe0c0"/>
      </linearGradient></defs>
      <ellipse cx="220" cy="150" rx="70" ry="28" fill="#ffffff" opacity="0.85"/>
      <ellipse cx="580" cy="110" rx="90" ry="32" fill="#ffffff" opacity="0.8"/>
      <rect y="430" width="800" height="170" fill="#9fbf8a"/>
    `),
  },
];
