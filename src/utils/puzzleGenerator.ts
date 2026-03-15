import type { Board, Piece, Puzzle, CellOffset } from '@/types/game';
import { GRID_SIZE, hasFullLine, createEmptyBoard, canPlace, placePiece, checkAndClearLines } from './gameLogic';
import { SMALL_SHAPES, BIG_SHAPES } from './shapes';
import { solve } from './solver';
import { mulberry32, dateToSeed, puzzleNumberFromDate } from './dailySeed';

const MAX_ITERATIONS = 20000;

// Fill range the generator explores per iteration
const FILL_MIN = 0.64;
const FILL_MAX = 0.78;

export interface PuzzleQuality {
  small1ValidPositions: number;
  small1ClearPositions: number;
  small2ValidPositions: number;
  small2ClearPositions: number;
  nearCompleteRows: number;
  nearCompleteCols: number;
  nearCompleteLines: number;
  minValidPositions: number;
  minClearPositions: number;
  solutionRowClears: number;
  solutionColClears: number;
  score: number;
}

function countValidPositions(board: Board, cells: CellOffset[]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(board, cells, r, c)) count++;
    }
  }
  return count;
}

function countClearPositions(board: Board, cells: CellOffset[]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!canPlace(board, cells, r, c)) continue;
      const placed = placePiece(board, cells, r, c);
      const { clearedRows, clearedCols } = checkAndClearLines(placed);
      if (clearedRows.length > 0 || clearedCols.length > 0) count++;
    }
  }
  return count;
}

function countNearCompleteLines(board: Board): { rows: number; cols: number } {
  let rows = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    const empty = board[r].filter((c) => c === 0).length;
    if (empty >= 1 && empty <= 3) rows++;
  }
  let cols = 0;
  for (let c = 0; c < GRID_SIZE; c++) {
    let empty = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] === 0) empty++;
    }
    if (empty >= 1 && empty <= 3) cols++;
  }
  return { rows, cols };
}

function countSolutionClears(puzzle: Puzzle): { rowClears: number; colClears: number } {
  let rowClears = 0;
  let colClears = 0;
  let board = puzzle.board.map((r) => [...r]);
  for (const step of puzzle.solution.steps) {
    const placed = placePiece(board, step.piece.cells, step.row, step.col);
    const result = checkAndClearLines(placed);
    rowClears += result.clearedRows.length;
    colClears += result.clearedCols.length;
    board = result.board;
  }
  return { rowClears, colClears };
}

function qualityScore(q: Omit<PuzzleQuality, 'score'>): number {
  // Column clears are harder to spot than row clears, so reward them
  // and penalize row-dominated solutions.
  const colClearBonus = q.solutionColClears * 8;
  const rowClearPenalty = q.solutionRowClears * -3;

  return (
    q.minClearPositions * 5 +
    q.minValidPositions * 2 +
    q.nearCompleteRows * 1 +
    q.nearCompleteCols * 4 +
    colClearBonus +
    rowClearPenalty
  );
}

export function assessQuality(puzzle: Puzzle): PuzzleQuality {
  const [small1, small2] = puzzle.pieces;
  const board = puzzle.board;
  const s1Valid = countValidPositions(board, small1.cells);
  const s1Clear = countClearPositions(board, small1.cells);
  const s2Valid = countValidPositions(board, small2.cells);
  const s2Clear = countClearPositions(board, small2.cells);
  const ncl = countNearCompleteLines(board);
  const solClears = countSolutionClears(puzzle);

  const partial = {
    small1ValidPositions: s1Valid,
    small1ClearPositions: s1Clear,
    small2ValidPositions: s2Valid,
    small2ClearPositions: s2Clear,
    nearCompleteRows: ncl.rows,
    nearCompleteCols: ncl.cols,
    nearCompleteLines: ncl.rows + ncl.cols,
    minValidPositions: Math.min(s1Valid, s2Valid),
    minClearPositions: Math.min(s1Clear, s2Clear),
    solutionRowClears: solClears.rowClears,
    solutionColClears: solClears.colClears,
  };

  return { ...partial, score: qualityScore(partial) };
}

function generateRandomBoard(rng: () => number, fillPercent: number): Board {
  const board = createEmptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c] = rng() < fillPercent ? 1 : 0;
    }
  }
  return board;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generatePuzzle(seed: number): Puzzle | null {
  const rng = mulberry32(seed);

  let bestPuzzle: Puzzle | null = null;
  let bestScore = -1;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const sv1 = pick(SMALL_SHAPES, rng);
    let sv2 = pick(SMALL_SHAPES, rng);
    let guard = 0;
    // Require different base shapes so pieces look and feel distinct
    while (sv2.baseShape === sv1.baseShape && guard < 20) {
      sv2 = pick(SMALL_SHAPES, rng);
      guard++;
    }
    if (sv2.baseShape === sv1.baseShape) continue;

    const bigSv = pick(BIG_SHAPES, rng);

    const small1: Piece = {
      id: sv1.id,
      cells: sv1.cells,
      colorIndex: 1,
      role: 'small1',
    };
    const small2: Piece = {
      id: sv2.id,
      cells: sv2.cells,
      colorIndex: 2,
      role: 'small2',
    };
    const big: Piece = {
      id: bigSv.id,
      cells: bigSv.cells,
      colorIndex: 3,
      role: 'big',
    };

    // RNG picks a fill in the valid range each iteration
    const fill = FILL_MIN + rng() * (FILL_MAX - FILL_MIN);
    const board = generateRandomBoard(rng, fill);

    if (hasFullLine(board)) continue;

    // Quick quality checks before expensive solve
    const ncl = countNearCompleteLines(board);
    const nclTotal = ncl.rows + ncl.cols;
    if (nclTotal < 4) continue;

    const s1v = countValidPositions(board, small1.cells);
    const s2v = countValidPositions(board, small2.cells);
    if (s1v < 3 || s2v < 3) continue;

    const solutions = solve(board, small1, small2, big, 3);
    if (solutions.length !== 1) continue;

    // Clear positions are expensive — only compute for valid puzzles
    const s1c = countClearPositions(board, small1.cells);
    const s2c = countClearPositions(board, small2.cells);
    if (s1c < 2 || s2c < 2) continue;

    const candidate: Puzzle = {
      board,
      pieces: [small1, small2, big],
      solution: solutions[0],
      puzzleNumber: 0,
      date: '',
    };

    const solClears = countSolutionClears(candidate);
    const score = qualityScore({
      small1ValidPositions: s1v,
      small1ClearPositions: s1c,
      small2ValidPositions: s2v,
      small2ClearPositions: s2c,
      nearCompleteRows: ncl.rows,
      nearCompleteCols: ncl.cols,
      nearCompleteLines: nclTotal,
      minValidPositions: Math.min(s1v, s2v),
      minClearPositions: Math.min(s1c, s2c),
      solutionRowClears: solClears.rowClears,
      solutionColClears: solClears.colClears,
    });

    if (score > bestScore) {
      bestScore = score;
      bestPuzzle = candidate;
      if (score >= 50) break;
    }
  }

  return bestPuzzle;
}

export function generateDailyPuzzle(date: string): Puzzle {
  const baseSeed = dateToSeed(date);
  const puzzleNum = puzzleNumberFromDate(date);

  // Use large prime multiplier so adjacent dates produce very different seeds
  const spread = (s: number, a: number) => Math.imul(s, 2654435761) + a * 1000003;

  let bestPuzzle: Puzzle | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 200; attempt++) {
    const puzzle = generatePuzzle(spread(baseSeed, attempt));
    if (puzzle) {
      const q = assessQuality(puzzle);
      if (q.score > bestScore) {
        bestScore = q.score;
        bestPuzzle = puzzle;
        bestPuzzle.puzzleNumber = puzzleNum;
        bestPuzzle.date = date;
      }
      if (bestScore >= 50) break;
    }
  }

  if (bestPuzzle) return bestPuzzle;

  throw new Error('Could not generate puzzle after extended attempts');
}
