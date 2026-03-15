'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Board as BoardType, CellOffset, ClearAnimation, PlacementHint, HintStyle } from '@/types/game';
import { GRID_SIZE } from '@/utils/gameLogic';
import { drawTile, preloadTiles, areTilesReady, getTileImage } from '@/utils/tileRenderer';

interface BoardProps {
  board: BoardType;
  cellSize: number;
  ghostCells: CellOffset[] | null;
  ghostValid: boolean;
  clearAnimation: ClearAnimation | null;
  hintOutlines: PlacementHint[];
  hintStyleMap: Map<number, HintStyle>;
  reviewMode: boolean;
  debugSolutionCells?: CellOffset[] | null;
}

const COLORS = {
  boardBg: '#0d1545',
  cellEmpty: '#151d5a',
  gridLine: 'rgba(255,255,255,0.04)',
  ghostValid: 'rgba(76, 175, 80, 0.4)',
  ghostInvalid: 'rgba(229, 57, 53, 0.2)',
  clearFlash: 'rgba(255, 255, 255, 0.9)',
  hintOutlineCorrect: '#4caf50',
  hintOutlineWrong: '#e53935',
  hintFillCorrect: 'rgba(100, 181, 246, 0.45)',
  hintFillWrong: 'rgba(255, 152, 0, 0.45)',
  hintFillBorderCorrect: '#64b5f6',
  hintFillBorderWrong: '#ff9800',
};

export default function Board({
  board,
  cellSize,
  ghostCells,
  ghostValid,
  clearAnimation,
  hintOutlines,
  hintStyleMap,
  reviewMode,
  debugSolutionCells,
}: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalSize = cellSize * GRID_SIZE;

  useEffect(() => {
    if (!areTilesReady()) {
      preloadTiles(() => draw());
    }
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalSize * dpr;
    canvas.height = totalSize * dpr;
    ctx.scale(dpr, dpr);

    // Board background
    const boardBgImg = getTileImage('boardBg');
    if (boardBgImg && boardBgImg.complete && boardBgImg.naturalWidth > 0) {
      ctx.drawImage(boardBgImg, 0, 0, totalSize, totalSize);
    } else {
      ctx.fillStyle = COLORS.boardBg;
      ctx.beginPath();
      ctx.roundRect(0, 0, totalSize, totalSize, 8);
      ctx.fill();
    }

    const clearCellSet = new Set<string>();
    if (clearAnimation) {
      for (const [r, c] of clearAnimation.cells) {
        clearCellSet.add(`${r},${c}`);
      }
    }

    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        if (clearCellSet.has(`${r},${c}`)) {
          const progress = clearAnimation!.progress;
          const scale = 1 - progress * 0.3;
          const alpha = 1 - progress;
          ctx.save();
          ctx.globalAlpha = alpha;
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);
          ctx.translate(-cx, -cy);

          if (progress < 0.3) {
            ctx.fillStyle = COLORS.clearFlash;
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 2);
            ctx.fill();
          } else {
            drawTile(ctx, x, y, cellSize, 'board');
          }

          ctx.restore();
        } else if (board[r][c] === 1) {
          drawTile(ctx, x, y, cellSize, 'board');
        }
      }
    }

    // Ghost preview
    if (ghostCells && !reviewMode) {
      ctx.fillStyle = ghostValid ? COLORS.ghostValid : COLORS.ghostInvalid;
      for (const [r, c] of ghostCells) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          ctx.beginPath();
          ctx.roundRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2, 2);
          ctx.fill();
        }
      }
    }

    // Hint overlays
    for (const hint of hintOutlines) {
      const style = hintStyleMap.get(hint.pieceIndex) ?? 'outline';

      if (style === 'outline') {
        const color = hint.correct ? COLORS.hintOutlineCorrect : COLORS.hintOutlineWrong;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        for (const [r, c] of hint.cells) {
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            ctx.strokeRect(
              c * cellSize + 2,
              r * cellSize + 2,
              cellSize - 4,
              cellSize - 4
            );
          }
        }
        ctx.restore();
      } else {
        const fillColor = hint.correct ? COLORS.hintFillCorrect : COLORS.hintFillWrong;
        const borderColor = hint.correct ? COLORS.hintFillBorderCorrect : COLORS.hintFillBorderWrong;

        for (const [r, c] of hint.cells) {
          if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
          const x = c * cellSize;
          const y = r * cellSize;

          ctx.fillStyle = fillColor;
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          // Diagonal stripes
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.clip();
          ctx.strokeStyle = borderColor + '55';
          ctx.lineWidth = 1;
          const step = 6;
          for (let d = -cellSize; d < cellSize * 2; d += step) {
            ctx.beginPath();
            ctx.moveTo(x + d, y);
            ctx.lineTo(x + d + cellSize, y + cellSize);
            ctx.stroke();
          }
          ctx.restore();

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
      }
    }
    // Debug solution overlay
    if (debugSolutionCells) {
      ctx.save();
      ctx.shadowColor = '#fdd835';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#fdd835';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(253, 216, 53, 0.25)';
      for (const [r, c] of debugSolutionCells) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const x = c * cellSize;
          const y = r * cellSize;
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
      }
      ctx.restore();
    }
  }, [board, cellSize, totalSize, ghostCells, ghostValid, clearAnimation, hintOutlines, hintStyleMap, reviewMode, debugSolutionCells]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: totalSize, height: totalSize }}
      className="rounded-lg"
    />
  );
}
