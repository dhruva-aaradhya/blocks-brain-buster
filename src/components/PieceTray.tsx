'use client';

import { useRef, useEffect } from 'react';
import type { Piece } from '@/types/game';
import { drawTile, getShapeBounds, tileKeyForColorIndex, preloadTiles, areTilesReady } from '@/utils/tileRenderer';

interface PieceTrayProps {
  pieces: Piece[];
  placed: [boolean, boolean, boolean];
  cellSize: number;
  onDragStart: (pieceIndex: number, clientX: number, clientY: number) => void;
  disabled: boolean;
}

function PieceSlot({
  piece,
  isPlaced,
  cellSize,
  index,
  onDragStart,
  disabled,
}: {
  piece: Piece;
  isPlaced: boolean;
  cellSize: number;
  index: number;
  onDragStart: (pieceIndex: number, clientX: number, clientY: number) => void;
  disabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniSize = cellSize * 0.55;
  const bounds = getShapeBounds(piece.cells);
  const w = bounds.cols * miniSize;
  const h = bounds.rows * miniSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isPlaced) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const tileKey = tileKeyForColorIndex(piece.colorIndex);
      for (const [r, c] of piece.cells) {
        drawTile(ctx, c * miniSize, r * miniSize, miniSize, tileKey);
      }
    };

    render();
    if (!areTilesReady()) {
      preloadTiles(render);
    }
  }, [piece, isPlaced, miniSize, w, h]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPlaced || disabled) return;
    e.preventDefault();
    onDragStart(index, e.clientX, e.clientY);
  };

  if (isPlaced) {
    return <div className="flex-1 flex items-center justify-center min-h-[48px]" />;
  }

  return (
    <div
      className="flex-1 flex items-center justify-center min-h-[48px] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: w, height: h }}
        className="pointer-events-none"
      />
    </div>
  );
}

export default function PieceTray({
  pieces,
  placed,
  cellSize,
  onDragStart,
  disabled,
}: PieceTrayProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-2 glass rounded-xl mt-2">
      {pieces.map((piece, i) => (
        <PieceSlot
          key={piece.id + '-' + i}
          piece={piece}
          isPlaced={placed[i]}
          cellSize={cellSize}
          index={i}
          onDragStart={onDragStart}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
