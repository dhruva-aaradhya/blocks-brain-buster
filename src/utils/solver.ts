import type { Board, Piece, Solution, SolutionStep } from '@/types/game';
import {
  GRID_SIZE,
  canPlace,
  placePiece,
  checkAndClearLines,
  canFitAnywhere,
} from './gameLogic';

/**
 * Validates that no single small-piece placement (anywhere, with or without
 * line clears) creates enough space for the big piece. This is the core
 * constraint ensuring both small piece placements are required.
 */
export function noShortcutExists(
  board: Board,
  p1: Piece,
  p2: Piece,
  bigPiece: Piece
): boolean {
  if (canFitAnywhere(board, bigPiece.cells)) return false;

  for (const small of [p1, p2]) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!canPlace(board, small.cells, r, c)) continue;

        const placed = placePiece(board, small.cells, r, c);
        if (canFitAnywhere(placed, bigPiece.cells)) return false;

        const { board: cleared } = checkAndClearLines(placed);
        if (canFitAnywhere(cleared, bigPiece.cells)) return false;
      }
    }
  }

  return true;
}

/**
 * Brute-force solver. Returns all valid solutions up to solutionLimit.
 *
 * Constraint chain:
 * 1. noShortcut must hold
 * 2. Each small piece placement MUST trigger a line clear
 * 3. Big piece fits only after both clears
 */
export function solve(
  board: Board,
  p1: Piece,
  p2: Piece,
  bigPiece: Piece,
  solutionLimit: number = 10
): Solution[] {
  if (!noShortcutExists(board, p1, p2, bigPiece)) return [];

  const solutions: Solution[] = [];
  const orderings: [Piece, Piece][] = [
    [p1, p2],
    [p2, p1],
  ];

  for (const [first, second] of orderings) {
    if (solutions.length >= solutionLimit) break;

    for (let r1 = 0; r1 < GRID_SIZE; r1++) {
      for (let c1 = 0; c1 < GRID_SIZE; c1++) {
        if (solutions.length >= solutionLimit) break;
        if (!canPlace(board, first.cells, r1, c1)) continue;

        const board1 = placePiece(board, first.cells, r1, c1);
        const clear1 = checkAndClearLines(board1);

        if (clear1.clearedRows.length === 0 && clear1.clearedCols.length === 0) continue;

        for (let r2 = 0; r2 < GRID_SIZE; r2++) {
          for (let c2 = 0; c2 < GRID_SIZE; c2++) {
            if (solutions.length >= solutionLimit) break;
            if (!canPlace(clear1.board, second.cells, r2, c2)) continue;

            const board2 = placePiece(clear1.board, second.cells, r2, c2);
            const clear2 = checkAndClearLines(board2);

            if (clear2.clearedRows.length === 0 && clear2.clearedCols.length === 0) continue;

            for (let r3 = 0; r3 < GRID_SIZE; r3++) {
              for (let c3 = 0; c3 < GRID_SIZE; c3++) {
                if (solutions.length >= solutionLimit) break;
                if (!canPlace(clear2.board, bigPiece.cells, r3, c3)) continue;

                const steps: SolutionStep[] = [
                  { piece: first, row: r1, col: c1 },
                  { piece: second, row: r2, col: c2 },
                  { piece: bigPiece, row: r3, col: c3 },
                ];

                const isDuplicate = solutions.some(
                  (s) =>
                    s.steps[0].piece.id === steps[0].piece.id &&
                    s.steps[0].row === steps[0].row &&
                    s.steps[0].col === steps[0].col &&
                    s.steps[1].piece.id === steps[1].piece.id &&
                    s.steps[1].row === steps[1].row &&
                    s.steps[1].col === steps[1].col &&
                    s.steps[2].row === steps[2].row &&
                    s.steps[2].col === steps[2].col
                );

                if (!isDuplicate) {
                  solutions.push({ steps });
                }
              }
            }
          }
        }
      }
    }
  }

  return solutions;
}
