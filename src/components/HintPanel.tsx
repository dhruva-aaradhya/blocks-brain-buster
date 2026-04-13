'use client';

import { useRef, useEffect } from 'react';
import type { AttemptResult, Piece } from '@/types/game';
import { motion } from 'framer-motion';
import { drawTile, getShapeBounds, tileKeyForColorIndex, areTilesReady, preloadTiles } from '@/utils/tileRenderer';

interface HintPanelProps {
  attemptResult: AttemptResult;
  pieces: Piece[];
  onNext: () => void;
}

function MiniPiece({ piece, size }: { piece: Piece; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bounds = getShapeBounds(piece.cells);
  const w = bounds.cols * size;
  const h = bounds.rows * size;

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const key = tileKeyForColorIndex(piece.colorIndex);
      for (const [r, c] of piece.cells) {
        drawTile(ctx, c * size, r * size, size, key);
      }
    };
    render();
    if (!areTilesReady()) preloadTiles(render);
  }, [piece, size, w, h]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: w, height: h }}
      className="inline-block"
    />
  );
}

export default function HintPanel({ attemptResult, pieces, onNext }: HintPanelProps) {
  const { orderCorrect, placementHints } = attemptResult;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-0.5"
    >
      <div className="flex items-center justify-center gap-3">
        {placementHints.map((hint, i) => {
          const piece = pieces[hint.pieceIndex];
          return (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                hint.correct ? 'bg-green-500/15' : 'bg-red-500/15'
              }`}
            >
              <MiniPiece piece={piece} size={10} />
              <span className={`text-sm ${hint.correct ? 'text-green-400' : 'text-red-400'}`}>
                {hint.correct ? '✓' : '✗'}
              </span>
            </div>
          );
        })}
        {orderCorrect !== null && (
          <span className={`text-[11px] font-medium ${
            orderCorrect ? 'text-green-400' : 'text-red-400'
          }`}>
            {orderCorrect ? '✓ Right order' : '✗ Wrong order'}
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        className="text-white/50 hover:text-white active:text-white text-sm py-2 px-4 min-h-[44px] transition"
      >
        Next Attempt →
      </button>
    </motion.div>
  );
}
