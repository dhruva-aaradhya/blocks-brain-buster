'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Puzzle, Board, CellOffset } from '@/types/game';
import { cloneBoard, placePiece, checkAndClearLines, GRID_SIZE } from '@/utils/gameLogic';
import { assessQuality, type PuzzleQuality } from '@/utils/puzzleGenerator';

interface DebugPanelProps {
  puzzle: Puzzle;
  seed: number;
  onSeedChange: (seed: number) => void;
  onRegenerate: () => void;
  onShowSolution: (stepIndex: number | null) => void;
}

interface SolutionStepDetail {
  pieceId: string;
  pieceCells: CellOffset[];
  row: number;
  col: number;
  clearedRows: number[];
  clearedCols: number[];
  cellsFreed: number;
  boardBefore: Board;
  boardAfter: Board;
}

function countFilled(board: Board): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (board[r][c] === 1) count++;
  return count;
}

function renderMiniShape(cells: CellOffset[]): string {
  if (cells.length === 0) return '';
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  const grid: string[][] = Array.from({ length: maxR + 1 }, () =>
    Array(maxC + 1).fill('·')
  );
  for (const [r, c] of cells) grid[r][c] = '■';
  return grid.map((row) => row.join('')).join('\n');
}

export default function DebugPanel({
  puzzle,
  seed,
  onSeedChange,
  onRegenerate,
  onShowSolution,
}: DebugPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [seedInput, setSeedInput] = useState(String(seed));
  const [copied, setCopied] = useState(false);
  const [solutionStep, setSolutionStep] = useState<number | null>(null);

  const boardStats = useMemo(() => {
    const filled = countFilled(puzzle.board);
    const total = GRID_SIZE * GRID_SIZE;
    return {
      filled,
      empty: total - filled,
      fillPercent: ((filled / total) * 100).toFixed(1),
    };
  }, [puzzle.board]);

  const quality = useMemo((): PuzzleQuality => {
    return assessQuality(puzzle);
  }, [puzzle]);

  const solutionDetails = useMemo((): SolutionStepDetail[] => {
    const details: SolutionStepDetail[] = [];
    let currentBoard = cloneBoard(puzzle.board);

    for (const step of puzzle.solution.steps) {
      const boardBefore = cloneBoard(currentBoard);
      const placed = placePiece(currentBoard, step.piece.cells, step.row, step.col);
      const clearResult = checkAndClearLines(placed);

      const cellsFreed =
        clearResult.clearedRows.length * GRID_SIZE +
        clearResult.clearedCols.length * GRID_SIZE -
        clearResult.clearedRows.length * clearResult.clearedCols.length;

      details.push({
        pieceId: step.piece.id,
        pieceCells: step.piece.cells,
        row: step.row,
        col: step.col,
        clearedRows: clearResult.clearedRows,
        clearedCols: clearResult.clearedCols,
        cellsFreed,
        boardBefore,
        boardAfter: clearResult.board,
      });

      currentBoard = clearResult.board;
    }

    return details;
  }, [puzzle]);

  const handleCopyJSON = useCallback(() => {
    const data = {
      puzzleNumber: puzzle.puzzleNumber,
      date: puzzle.date,
      seed,
      board: puzzle.board,
      boardStats: {
        filled: boardStats.filled,
        empty: boardStats.empty,
        fillPercent: boardStats.fillPercent,
      },
      quality: {
        score: quality.score,
        nearCompleteRows: quality.nearCompleteRows,
        nearCompleteCols: quality.nearCompleteCols,
        nearCompleteLines: quality.nearCompleteLines,
        small1ValidPositions: quality.small1ValidPositions,
        small1ClearPositions: quality.small1ClearPositions,
        small2ValidPositions: quality.small2ValidPositions,
        small2ClearPositions: quality.small2ClearPositions,
        minValidPositions: quality.minValidPositions,
        minClearPositions: quality.minClearPositions,
        solutionRowClears: quality.solutionRowClears,
        solutionColClears: quality.solutionColClears,
      },
      pieces: puzzle.pieces.map((p) => ({
        id: p.id,
        role: p.role,
        cells: p.cells,
        cellCount: p.cells.length,
      })),
      solution: puzzle.solution.steps.map((s, i) => ({
        step: i + 1,
        pieceId: s.piece.id,
        role: s.piece.role,
        position: { row: s.row, col: s.col },
        clearedRows: solutionDetails[i]?.clearedRows ?? [],
        clearedCols: solutionDetails[i]?.clearedCols ?? [],
        cellsFreed: solutionDetails[i]?.cellsFreed ?? 0,
      })),
    };

    const text = JSON.stringify(data, null, 2);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [puzzle, seed, boardStats, quality, solutionDetails]);

  const handleStepVisualize = useCallback(
    (stepIdx: number | null) => {
      setSolutionStep(stepIdx);
      onShowSolution(stepIdx);
    },
    [onShowSolution]
  );

  const handleSeedGo = () => {
    const newSeed = parseInt(seedInput, 10);
    if (!isNaN(newSeed)) onSeedChange(newSeed);
  };

  const handleSkip = (delta: number) => {
    const newSeed = seed + delta;
    setSeedInput(String(newSeed));
    onSeedChange(newSeed);
  };

  const roleLabel = (role: string) => {
    if (role === 'small1') return 'Small 1 (red)';
    if (role === 'small2') return 'Small 2 (blue)';
    return 'Big (yellow)';
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed top-2 right-2 z-50 bg-yellow-600 text-black text-xs font-bold px-2 py-1 rounded"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 z-50 w-80 max-h-screen overflow-y-auto bg-gray-900/95 border-l border-yellow-600/50 text-white text-xs font-mono p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-yellow-400 font-bold text-sm">DEBUG PANEL</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Puzzle Info */}
      <section className="space-y-1">
        <h3 className="text-yellow-400/80 font-bold uppercase tracking-wide" style={{ fontSize: '10px' }}>
          Puzzle Info
        </h3>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <span className="text-white/50">Puzzle #</span>
          <span>{puzzle.puzzleNumber}</span>
          <span className="text-white/50">Date</span>
          <span>{puzzle.date}</span>
          <span className="text-white/50">Seed</span>
          <span>{seed}</span>
          <span className="text-white/50">Fill %</span>
          <span>{boardStats.fillPercent}%</span>
          <span className="text-white/50">Filled cells</span>
          <span>{boardStats.filled} / {GRID_SIZE * GRID_SIZE}</span>
          <span className="text-white/50">Empty cells</span>
          <span>{boardStats.empty}</span>
        </div>
      </section>

      {/* Quality Metrics */}
      <section className="space-y-1">
        <h3 className="text-yellow-400/80 font-bold uppercase tracking-wide" style={{ fontSize: '10px' }}>
          Quality Metrics
        </h3>
        <div className="bg-white/5 rounded p-1.5 mb-1">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Overall score</span>
            <span className={`font-bold ${quality.score >= 80 ? 'text-green-400' : quality.score >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
              {quality.score}
            </span>
          </div>
          <div className="text-white/30 mt-0.5" style={{ fontSize: '9px' }}>
            80+ = excellent, 55-79 = good, &lt;55 = weak
          </div>
        </div>
        <div className="bg-white/5 rounded p-1.5 mb-1">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Near-complete lines</span>
            <span className={`font-bold ${quality.nearCompleteLines >= 10 ? 'text-green-400' : quality.nearCompleteLines >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
              {quality.nearCompleteLines}
            </span>
          </div>
          <div className="flex justify-between items-center text-white/50 mt-0.5">
            <span>Rows: {quality.nearCompleteRows} &middot; Cols: {quality.nearCompleteCols}</span>
          </div>
        </div>
        <div className="bg-white/5 rounded p-1.5 mb-1">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Solution clears</span>
            <span className="font-bold">
              <span className={quality.solutionRowClears <= 1 ? 'text-green-400' : 'text-red-400'}>{quality.solutionRowClears}R</span>
              {' '}
              <span className={quality.solutionColClears >= 1 ? 'text-green-400' : 'text-yellow-400'}>{quality.solutionColClears}C</span>
            </span>
          </div>
          <div className="text-white/30 mt-0.5" style={{ fontSize: '9px' }}>
            Column clears are harder to spot. Row-heavy = easier puzzle.
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-0.5 items-center">
          <span className="text-white/50"></span>
          <span className="text-white/50 text-center">Fit</span>
          <span className="text-white/50 text-center">Clear</span>

          <span className="text-white/70">Small 1</span>
          <span className={`text-center ${quality.small1ValidPositions >= 4 ? 'text-green-400' : quality.small1ValidPositions >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
            {quality.small1ValidPositions}
          </span>
          <span className={`text-center font-bold ${quality.small1ClearPositions >= 3 ? 'text-green-400' : quality.small1ClearPositions >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
            {quality.small1ClearPositions}
          </span>

          <span className="text-white/70">Small 2</span>
          <span className={`text-center ${quality.small2ValidPositions >= 4 ? 'text-green-400' : quality.small2ValidPositions >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
            {quality.small2ValidPositions}
          </span>
          <span className={`text-center font-bold ${quality.small2ClearPositions >= 3 ? 'text-green-400' : quality.small2ClearPositions >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
            {quality.small2ClearPositions}
          </span>
        </div>
        <div className="text-white/30 mt-1" style={{ fontSize: '9px' }}>
          Fit = positions piece can go. Clear = positions that trigger a line clear.
        </div>
      </section>

      {/* Pieces */}
      <section className="space-y-1">
        <h3 className="text-yellow-400/80 font-bold uppercase tracking-wide" style={{ fontSize: '10px' }}>
          Pieces
        </h3>
        {puzzle.pieces.map((p, i) => (
          <div key={i} className="flex gap-2 items-start bg-white/5 rounded p-1.5">
            <div className="shrink-0">
              <div className="text-white/50 mb-0.5">{roleLabel(p.role)}</div>
              <div className="text-white/70">{p.id}</div>
              <div className="text-white/40">{p.cells.length} cells</div>
            </div>
            <pre className="text-green-400 leading-tight ml-auto">{renderMiniShape(p.cells)}</pre>
          </div>
        ))}
      </section>

      {/* Solution Walkthrough */}
      <section className="space-y-1">
        <h3 className="text-yellow-400/80 font-bold uppercase tracking-wide" style={{ fontSize: '10px' }}>
          Solution Walkthrough
        </h3>
        {solutionDetails.map((step, i) => {
          const isActive = solutionStep === i;
          return (
            <div
              key={i}
              className={`rounded p-1.5 cursor-pointer transition-colors ${
                isActive ? 'bg-yellow-600/30 border border-yellow-600/50' : 'bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => handleStepVisualize(isActive ? null : i)}
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">
                  Step {i + 1}: {step.pieceId}
                </span>
                <span className="text-white/40">
                  ({step.row}, {step.col})
                </span>
              </div>
              <div className="text-white/60 mt-0.5">
                {step.clearedRows.length > 0 && (
                  <span>
                    Rows cleared: [{step.clearedRows.join(', ')}]
                    {' '}
                  </span>
                )}
                {step.clearedCols.length > 0 && (
                  <span>
                    Cols cleared: [{step.clearedCols.join(', ')}]
                    {' '}
                  </span>
                )}
                {step.clearedRows.length === 0 && step.clearedCols.length === 0 && (
                  <span className="text-red-400">No clears!</span>
                )}
              </div>
              {step.cellsFreed > 0 && (
                <div className="text-green-400/80">
                  {step.cellsFreed} cells freed
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => handleStepVisualize(null)}
            className={`flex-1 py-1 rounded text-xs ${
              solutionStep === null ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Reset View
          </button>
        </div>
      </section>

      {/* Seed Controls */}
      <section className="space-y-1">
        <h3 className="text-yellow-400/80 font-bold uppercase tracking-wide" style={{ fontSize: '10px' }}>
          Seed Controls
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => handleSkip(-1)}
            className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
          >
            ◀ Prev
          </button>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            className="flex-1 bg-white/10 rounded px-2 py-1 text-center text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSeedGo()}
          />
          <button
            onClick={() => handleSkip(1)}
            className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
          >
            Next ▶
          </button>
        </div>
        <button
          onClick={handleSeedGo}
          className="w-full bg-yellow-600/30 hover:bg-yellow-600/50 py-1 rounded"
        >
          Go to seed
        </button>
      </section>

      {/* Regenerate */}
      <section className="space-y-1">
        <button
          onClick={() => onRegenerate()}
          className="w-full bg-blue-600/30 hover:bg-blue-600/50 py-1 rounded"
        >
          Regenerate (auto-fill)
        </button>
      </section>

      {/* Copy JSON */}
      <section>
        <button
          onClick={handleCopyJSON}
          className={`w-full py-1.5 rounded font-bold transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-yellow-600/50 hover:bg-yellow-600/70 text-yellow-100'
          }`}
        >
          {copied ? '✓ Copied to clipboard!' : 'Copy Puzzle JSON'}
        </button>
        <p className="text-white/30 mt-1 text-center" style={{ fontSize: '9px' }}>
          Paste into chat to share puzzle data
        </p>
      </section>
    </div>
  );
}
