import type {
  Board,
  ClearResult,
  Piece,
  Placement,
  PlacementHint,
  Solution,
  CellOffset,
} from '@/types/game';

export const GRID_SIZE = 8;

export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function canPlace(board: Board, cells: CellOffset[], row: number, col: number): boolean {
  for (const [dr, dc] of cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (board[r][c] !== 0) return false;
  }
  return true;
}

export function placePiece(board: Board, cells: CellOffset[], row: number, col: number): Board {
  const newBoard = cloneBoard(board);
  for (const [dr, dc] of cells) {
    newBoard[row + dr][col + dc] = 1;
  }
  return newBoard;
}

export function canFitAnywhere(board: Board, cells: CellOffset[]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(board, cells, r, c)) return true;
    }
  }
  return false;
}

export function checkAndClearLines(board: Board): ClearResult {
  const newBoard = cloneBoard(board);
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (newBoard[r].every((cell) => cell === 1)) {
      clearedRows.push(r);
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (newBoard[r][c] !== 1) {
        full = false;
        break;
      }
    }
    if (full) clearedCols.push(c);
  }

  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) {
      newBoard[r][c] = 0;
    }
  }
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      newBoard[r][c] = 0;
    }
  }

  return { board: newBoard, clearedRows, clearedCols };
}

export function hasFullLine(board: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r].every((cell) => cell === 1)) return true;
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] !== 1) {
        full = false;
        break;
      }
    }
    if (full) return true;
  }
  return false;
}

export function isStuck(board: Board, pieces: Piece[], placed: boolean[]): boolean {
  for (let i = 0; i < pieces.length; i++) {
    if (placed[i]) continue;
    if (canFitAnywhere(board, pieces[i].cells)) return false;
  }
  return true;
}

export function computeHints(
  placements: Placement[],
  pieces: Piece[],
  solution: Solution
): { orderCorrect: boolean | null; placementHints: PlacementHint[] } {
  const placementHints: PlacementHint[] = [];

  const smallPlacements = placements.filter((p) => p.pieceIndex < 2);

  for (const placement of smallPlacements) {
    const piece = pieces[placement.pieceIndex];
    const solutionStep = solution.steps.find((s) => s.piece.id === piece.id);

    const correct =
      solutionStep !== undefined &&
      solutionStep.row === placement.row &&
      solutionStep.col === placement.col;

    const absoluteCells: CellOffset[] = piece.cells.map(([dr, dc]) => [
      placement.row + dr,
      placement.col + dc,
    ]);

    placementHints.push({
      pieceIndex: placement.pieceIndex,
      row: placement.row,
      col: placement.col,
      correct,
      cells: absoluteCells,
    });
  }

  let orderCorrect: boolean | null = null;
  if (smallPlacements.length >= 2) {
    const playerOrder = smallPlacements.map((p) => p.pieceIndex);
    const solutionOrder = solution.steps.slice(0, 2).map((s) => {
      return pieces.findIndex((p) => p.id === s.piece.id);
    });
    orderCorrect =
      playerOrder[0] === solutionOrder[0] && playerOrder[1] === solutionOrder[1];
  }

  return { orderCorrect, placementHints };
}
