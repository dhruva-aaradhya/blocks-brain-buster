'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  Puzzle,
  Board as BoardType,
  GamePhase,
  DragState,
  ClearAnimation,
  Placement,
  AttemptResult,
  PlacementHint,
  HintStyle,
  CellOffset,
} from '@/types/game';
import {
  cloneBoard,
  canPlace,
  placePiece,
  checkAndClearLines,
  isStuck,
  computeHints,
  GRID_SIZE,
} from '@/utils/gameLogic';
import Board from './Board';
import PieceTray from './PieceTray';
import DragPiece from './DragPiece';
import AttemptDots from './AttemptDots';
import HintPanel from './HintPanel';
import EndCard from './EndCard';

interface GameProps {
  puzzle: Puzzle;
  initialAttempt: number;
  initialHistory: AttemptResult[];
  onComplete: (won: boolean, attempt: number, history: AttemptResult[]) => void;
  onBack: () => void;
  onAttemptEnd: (history: AttemptResult[], attempt: number) => void;
  debugSolutionStep?: number | null;
}

function replayPlacements(initialBoard: BoardType, placements: Placement[], pieces: Puzzle['pieces']): BoardType {
  let board = cloneBoard(initialBoard);
  for (const p of placements) {
    board = placePiece(board, pieces[p.pieceIndex].cells, p.row, p.col);
    const result = checkAndClearLines(board);
    board = result.board;
  }
  return board;
}

export default function Game({
  puzzle,
  initialAttempt,
  initialHistory,
  onComplete,
  onBack,
  onAttemptEnd,
  debugSolutionStep,
}: GameProps) {
  const [board, setBoard] = useState<BoardType>(() => cloneBoard(puzzle.board));
  const [placed, setPlaced] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [currentAttempt, setCurrentAttempt] = useState(initialAttempt);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [attemptHistory, setAttemptHistory] = useState<AttemptResult[]>(initialHistory);
  const [currentPlacements, setCurrentPlacements] = useState<Placement[]>([]);
  const [hintOutlines, setHintOutlines] = useState<PlacementHint[]>([]);
  const [reviewingAttempt, setReviewingAttempt] = useState(-1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [clearAnimation, setClearAnimation] = useState<ClearAnimation | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);

  useEffect(() => {
    const updateSize = () => {
      const maxW = Math.min(window.innerWidth - 32, 500);
      // Reserve space: header(40) + dots(40) + gap(12) + tray(90) + hint/padding(160)
      const reserved = 342;
      const maxH = window.innerHeight - reserved;
      setCellSize(Math.max(28, Math.floor(Math.min(maxW / GRID_SIZE, maxH / GRID_SIZE))));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const hintStyleMap = useMemo(() => {
    const map = new Map<number, HintStyle>();
    if (hintOutlines.length >= 1) {
      map.set(hintOutlines[0].pieceIndex, 'outline');
    }
    if (hintOutlines.length >= 2) {
      map.set(hintOutlines[1].pieceIndex, 'fill');
    }
    return map;
  }, [hintOutlines]);

  const resetAttempt = useCallback(() => {
    setBoard(cloneBoard(puzzle.board));
    setPlaced([false, false, false]);
    setCurrentPlacements([]);
    setHintOutlines([]);
    setReviewingAttempt(-1);
    setClearAnimation(null);
    setPhase('playing');
  }, [puzzle]);

  const endAttempt = useCallback(
    (solved: boolean) => {
      const { orderCorrect, placementHints } = computeHints(
        currentPlacements,
        puzzle.pieces,
        puzzle.solution
      );

      const result: AttemptResult = {
        placements: [...currentPlacements],
        solved,
        orderCorrect,
        placementHints,
      };

      const newHistory = [...attemptHistory, result];
      setAttemptHistory(newHistory);

      if (solved) {
        setPhase('won');
        onComplete(true, currentAttempt, newHistory);
      } else if (currentAttempt >= 6) {
        setPhase('lost');
        onComplete(false, currentAttempt, newHistory);
      } else {
        setHintOutlines(placementHints);
        setPhase('reviewing');
        onAttemptEnd(newHistory, currentAttempt + 1);
      }
    },
    [currentPlacements, puzzle, attemptHistory, currentAttempt, onComplete, onAttemptEnd]
  );

  const handlePlacement = useCallback(
    (pieceIndex: number, row: number, col: number) => {
      if (phase !== 'playing') return;

      const piece = puzzle.pieces[pieceIndex];
      if (!canPlace(board, piece.cells, row, col)) return;

      const newBoard = placePiece(board, piece.cells, row, col);
      const clearResult = checkAndClearLines(newBoard);
      const hasClear = clearResult.clearedRows.length > 0 || clearResult.clearedCols.length > 0;

      const newPlaced: [boolean, boolean, boolean] = [...placed];
      newPlaced[pieceIndex] = true;
      const newPlacements = [...currentPlacements, { pieceIndex, row, col }];

      setPlaced(newPlaced);
      setCurrentPlacements(newPlacements);

      if (hasClear) {
        const clearCells: CellOffset[] = [];
        for (const r of clearResult.clearedRows) {
          for (let c = 0; c < GRID_SIZE; c++) clearCells.push([r, c]);
        }
        for (const c of clearResult.clearedCols) {
          for (let r = 0; r < GRID_SIZE; r++) {
            if (!clearCells.some(([cr, cc]) => cr === r && cc === c)) {
              clearCells.push([r, c]);
            }
          }
        }

        setBoard(newBoard);
        setPhase('clearing');
        setClearAnimation({ cells: clearCells, progress: 0 });

        let start: number | null = null;
        const duration = 500;
        const animate = (ts: number) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          setClearAnimation({ cells: clearCells, progress });
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setClearAnimation(null);
            setBoard(clearResult.board);
            setPhase('playing');

            const allPlaced = newPlaced.every(Boolean);
            if (allPlaced) {
              setTimeout(() => {
                setPhase('won');
                const { orderCorrect, placementHints } = computeHints(
                  newPlacements,
                  puzzle.pieces,
                  puzzle.solution
                );
                const result: AttemptResult = {
                  placements: newPlacements,
                  solved: true,
                  orderCorrect,
                  placementHints,
                };
                const newHistory = [...attemptHistory, result];
                setAttemptHistory(newHistory);
                onComplete(true, currentAttempt, newHistory);
              }, 100);
              return;
            }

            if (isStuck(clearResult.board, puzzle.pieces, newPlaced)) {
              setTimeout(() => {
                const { orderCorrect, placementHints } = computeHints(
                  newPlacements,
                  puzzle.pieces,
                  puzzle.solution
                );
                const result: AttemptResult = {
                  placements: newPlacements,
                  solved: false,
                  orderCorrect,
                  placementHints,
                };
                const newHist = [...attemptHistory, result];
                setAttemptHistory(newHist);

                if (currentAttempt >= 6) {
                  setPhase('lost');
                  onComplete(false, currentAttempt, newHist);
                } else {
                  setHintOutlines(placementHints);
                  setPhase('reviewing');
                  onAttemptEnd(newHist, currentAttempt + 1);
                }
              }, 200);
            }
          }
        };
        requestAnimationFrame(animate);
      } else {
        setBoard(newBoard);

        const allPlaced = newPlaced.every(Boolean);
        if (allPlaced) {
          endAttempt(true);
          return;
        }

        if (isStuck(newBoard, puzzle.pieces, newPlaced)) {
          setTimeout(() => endAttempt(false), 300);
        }
      }
    },
    [board, placed, currentPlacements, phase, puzzle, attemptHistory, currentAttempt, endAttempt, onComplete, onAttemptEnd]
  );

  // Drag handling
  const handleDragStart = useCallback(
    (pieceIndex: number, clientX: number, clientY: number) => {
      if (phase !== 'playing' || placed[pieceIndex] || reviewingAttempt >= 0) return;
      setDragState({
        pieceIndex,
        offsetX: 0,
        offsetY: 0,
        currentX: clientX,
        currentY: clientY,
        ghostRow: -1,
        ghostCol: -1,
      });
    },
    [phase, placed, reviewingAttempt]
  );

  const computeGhostPosition = useCallback(
    (clientX: number, clientY: number, pieceIndex: number): { row: number; col: number } => {
      const boardEl = boardRef.current;
      if (!boardEl) return { row: -1, col: -1 };

      const rect = boardEl.getBoundingClientRect();
      const piece = puzzle.pieces[pieceIndex];

      let maxR = 0, maxC = 0;
      for (const [r, c] of piece.cells) {
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      }

      const dragSize = cellSize * 0.85;
      const pieceW = (maxC + 1) * dragSize;
      const pieceH = (maxR + 1) * dragSize;

      const centerX = clientX;
      const centerY = clientY - pieceH - cellSize * 1.5 + pieceH / 2;

      const gridX = centerX - rect.left - pieceW / 2;
      const gridY = centerY - rect.top - pieceH / 2;

      const col = Math.round(gridX / cellSize);
      const row = Math.round(gridY / cellSize);

      return { row, col };
    },
    [cellSize, puzzle.pieces]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (clientX: number, clientY: number) => {
      const ghost = computeGhostPosition(clientX, clientY, dragState.pieceIndex);
      setDragState((prev) =>
        prev
          ? { ...prev, currentX: clientX, currentY: clientY, ghostRow: ghost.row, ghostCol: ghost.col }
          : null
      );
    };

    const handleEnd = () => {
      setDragState((prev) => {
        if (!prev) return null;
        const piece = puzzle.pieces[prev.pieceIndex];
        if (
          prev.ghostRow >= 0 &&
          prev.ghostCol >= 0 &&
          canPlace(board, piece.cells, prev.ghostRow, prev.ghostCol)
        ) {
          setTimeout(() => handlePlacement(prev.pieceIndex, prev.ghostRow, prev.ghostCol), 0);
        }
        return null;
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      handleEnd();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragState, board, puzzle.pieces, computeGhostPosition, handlePlacement]);

  // Ghost cells for board overlay
  const ghostCells = useMemo((): CellOffset[] | null => {
    if (!dragState || dragState.ghostRow < 0) return null;
    const piece = puzzle.pieces[dragState.pieceIndex];
    return piece.cells.map(([dr, dc]) => [dragState.ghostRow + dr, dragState.ghostCol + dc] as CellOffset);
  }, [dragState, puzzle.pieces]);

  const ghostValid = useMemo(() => {
    if (!dragState || dragState.ghostRow < 0) return false;
    const piece = puzzle.pieces[dragState.pieceIndex];
    return canPlace(board, piece.cells, dragState.ghostRow, dragState.ghostCol);
  }, [dragState, board, puzzle.pieces]);

  // Attempt review
  const handleDotTap = useCallback(
    (attemptIndex: number) => {
      if (attemptIndex >= attemptHistory.length) return;
      if (reviewingAttempt === attemptIndex) {
        setReviewingAttempt(-1);
        if (phase === 'playing') {
          setBoard(replayPlacements(puzzle.board, currentPlacements, puzzle.pieces));
        } else {
          setBoard(cloneBoard(puzzle.board));
        }
        setHintOutlines([]);
        return;
      }

      setReviewingAttempt(attemptIndex);
      setBoard(cloneBoard(puzzle.board));
      setHintOutlines(attemptHistory[attemptIndex].placementHints);
    },
    [attemptHistory, reviewingAttempt, phase, puzzle, currentPlacements]
  );

  const dismissReview = useCallback(() => {
    setReviewingAttempt(-1);
    if (phase === 'playing') {
      setBoard(replayPlacements(puzzle.board, currentPlacements, puzzle.pieces));
    } else {
      setBoard(cloneBoard(puzzle.board));
    }
    setHintOutlines([]);
  }, [phase, puzzle, currentPlacements]);

  const handleNextAttempt = useCallback(() => {
    setCurrentAttempt((prev) => prev + 1);
    resetAttempt();
  }, [resetAttempt]);

  // Review hint style map based on placement order
  const reviewHintStyleMap = useMemo(() => {
    const map = new Map<number, HintStyle>();
    if (reviewingAttempt >= 0 && reviewingAttempt < attemptHistory.length) {
      const attempt = attemptHistory[reviewingAttempt];
      const smallPlacements = attempt.placements.filter((p) => p.pieceIndex < 2);
      if (smallPlacements.length >= 1) map.set(smallPlacements[0].pieceIndex, 'outline');
      if (smallPlacements.length >= 2) map.set(smallPlacements[1].pieceIndex, 'fill');
    }
    return map;
  }, [reviewingAttempt, attemptHistory]);

  const activeHintStyleMap = reviewingAttempt >= 0 ? reviewHintStyleMap : hintStyleMap;

  const debugSolutionCells = useMemo((): CellOffset[] | null => {
    if (debugSolutionStep == null || debugSolutionStep < 0) return null;
    const steps = puzzle.solution.steps;
    const targetStep = Math.min(debugSolutionStep, steps.length - 1);
    const cells: CellOffset[] = [];
    for (let i = 0; i <= targetStep; i++) {
      const s = steps[i];
      for (const [dr, dc] of s.piece.cells) {
        cells.push([s.row + dr, s.col + dc]);
      }
    }
    return cells;
  }, [debugSolutionStep, puzzle.solution.steps]);

  const totalSize = cellSize * GRID_SIZE;

  return (
    <div className="flex flex-col items-center h-[100dvh] px-4 select-none overflow-hidden">
      {/* Top: back button */}
      <div className="shrink-0 pt-3 pb-1" style={{ width: totalSize }}>
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white text-sm px-2 py-1"
        >
          ← Back
        </button>
      </div>

      {/* Middle: title + board centered */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <span className="text-gold font-bold text-lg mb-1">
          {puzzle.date === 'practice'
            ? `Seed #${puzzle.puzzleNumber}`
            : `Puzzle #${puzzle.puzzleNumber}`}
        </span>
        <div
          ref={boardRef}
          className="relative"
          style={{ width: totalSize, height: totalSize }}
          onClick={reviewingAttempt >= 0 ? dismissReview : undefined}
        >
          <Board
            board={board}
            cellSize={cellSize}
            ghostCells={ghostCells}
            ghostValid={ghostValid}
            clearAnimation={clearAnimation}
            hintOutlines={hintOutlines}
            hintStyleMap={activeHintStyleMap}
            reviewMode={reviewingAttempt >= 0}
            debugSolutionCells={debugSolutionCells}
          />
        </div>
      </div>

      {/* Bottom: fixed layout — tray, dots, feedback area all have stable positions */}
      <div className="shrink-0 pb-5" style={{ width: totalSize }}>
        <PieceTray
          pieces={puzzle.pieces}
          placed={placed}
          cellSize={cellSize}
          onDragStart={handleDragStart}
          disabled={phase !== 'playing' || reviewingAttempt >= 0}
        />

        <div className="mt-2">
          <AttemptDots
            currentAttempt={currentAttempt}
            attemptHistory={attemptHistory}
            reviewingAttempt={reviewingAttempt}
            onDotTap={handleDotTap}
            phase={phase}
          />
        </div>

        {/* Fixed-height feedback area — always present, content swaps in/out */}
        <div className="mt-1 h-14 flex items-center justify-center">
          {reviewingAttempt >= 0 ? (
            <p className="text-white/40 text-xs text-center animate-pulse">
              Tap board to return to current attempt
            </p>
          ) : phase === 'reviewing' ? (
            <HintPanel
              attemptResult={attemptHistory[attemptHistory.length - 1]}
              pieces={puzzle.pieces}
              onNext={handleNextAttempt}
            />
          ) : (phase === 'won' || phase === 'lost') ? (
            <EndCard
              won={phase === 'won'}
              puzzle={puzzle}
              attemptHistory={attemptHistory}
              currentAttempt={currentAttempt}
              onBack={onBack}
            />
          ) : null}
        </div>
      </div>

      {/* Drag piece overlay */}
      {dragState && (
        <DragPiece
          piece={puzzle.pieces[dragState.pieceIndex]}
          cellSize={cellSize}
          x={dragState.currentX}
          y={dragState.currentY}
        />
      )}
    </div>
  );
}
