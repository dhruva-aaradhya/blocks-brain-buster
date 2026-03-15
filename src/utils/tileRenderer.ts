import type { CellOffset } from '@/types/game';

const TILE_FILES: Record<string, string> = {
  board: '/tiles/teal.png',
  small1: '/tiles/pink.png',
  small2: '/tiles/purple.png',
  big: '/tiles/gold.png',
  boardBg: '/board-bg.png',
};

const imageCache = new Map<string, HTMLImageElement>();
let allLoaded = false;
const loadCallbacks: (() => void)[] = [];

function loadImage(key: string, src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  imageCache.set(key, img);
  return img;
}

export function preloadTiles(onReady?: () => void): void {
  if (allLoaded) {
    onReady?.();
    return;
  }
  if (onReady) loadCallbacks.push(onReady);

  if (imageCache.size > 0) return;

  let remaining = Object.keys(TILE_FILES).length;
  const done = () => {
    remaining--;
    if (remaining <= 0) {
      allLoaded = true;
      for (const cb of loadCallbacks) cb();
      loadCallbacks.length = 0;
    }
  };

  for (const [key, src] of Object.entries(TILE_FILES)) {
    const img = loadImage(key, src);
    img.onload = done;
    img.onerror = done;
  }
}

export function getTileImage(key: string): HTMLImageElement | null {
  return imageCache.get(key) ?? null;
}

export function areTilesReady(): boolean {
  return allLoaded;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tileKey: string,
) {
  const img = imageCache.get(tileKey);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, size, size);
  }
}

export function tileKeyForRole(role: string): string {
  if (role === 'small1') return 'small1';
  if (role === 'small2') return 'small2';
  if (role === 'big') return 'big';
  return 'board';
}

export function tileKeyForColorIndex(colorIndex: number): string {
  switch (colorIndex) {
    case 1: return 'small1';
    case 2: return 'small2';
    case 3: return 'big';
    default: return 'board';
  }
}

export function getShapeBounds(cells: CellOffset[]): { rows: number; cols: number } {
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}
