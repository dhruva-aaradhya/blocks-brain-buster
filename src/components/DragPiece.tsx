'use client';

import { useRef, useEffect } from 'react';
import type { Piece } from '@/types/game';
import { drawTile, getShapeBounds, tileKeyForColorIndex } from '@/utils/tileRenderer';

interface DragPieceProps {
  piece: Piece;
  cellSize: number;
  x: number;
  y: number;
}

export default function DragPiece({ piece, cellSize, x, y }: DragPieceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragSize = cellSize * 0.85;
  const bounds = getShapeBounds(piece.cells);
  const w = bounds.cols * dragSize;
  const h = bounds.rows * dragSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const tileKey = tileKeyForColorIndex(piece.colorIndex);
    for (const [r, c] of piece.cells) {
      drawTile(ctx, c * dragSize, r * dragSize, dragSize, tileKey);
    }
  }, [piece, dragSize, w, h]);

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: x - w / 2,
        top: y - h - cellSize * 1.5,
        width: w,
        height: h,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: w, height: h }}
      />
    </div>
  );
}
