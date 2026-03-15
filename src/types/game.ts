// === SHAPE TYPES ===

export type CellOffset = [number, number];

export interface ShapeVariant {
  id: string;
  baseShape: string;
  variantIndex: number;
  cells: CellOffset[];
  raw: string;
}

// === PIECE TYPES ===

export interface Piece {
  id: string;
  cells: CellOffset[];
  colorIndex: number; // 0=green(board), 1=red(piece1), 2=blue(piece2), 3=yellow(big piece)
  role: 'small1' | 'small2' | 'big';
}

// === BOARD TYPES ===

export type Board = number[][];

// === PUZZLE TYPES ===

export interface SolutionStep {
  piece: Piece;
  row: number;
  col: number;
}

export interface Solution {
  steps: SolutionStep[];
}

export interface Puzzle {
  board: Board;
  pieces: [Piece, Piece, Piece];
  solution: Solution;
  puzzleNumber: number;
  date: string;
}

// === ATTEMPT TYPES ===

export interface Placement {
  pieceIndex: number;
  row: number;
  col: number;
}

export interface PlacementHint {
  pieceIndex: number;
  row: number;
  col: number;
  correct: boolean;
  cells: CellOffset[];
}

export interface AttemptResult {
  placements: Placement[];
  solved: boolean;
  orderCorrect: boolean | null;
  placementHints: PlacementHint[];
}

// === GAME STATE ===

export type GamePhase =
  | 'playing'
  | 'clearing'
  | 'reviewing'
  | 'won'
  | 'lost';

export interface GameState {
  puzzle: Puzzle;
  board: Board;
  placed: [boolean, boolean, boolean];
  placedCount: number;
  currentAttempt: number;
  phase: GamePhase;
  attemptHistory: AttemptResult[];
  currentPlacements: Placement[];
  hintOutlines: PlacementHint[];
  reviewingAttempt: number;
}

// === DRAG STATE ===

export interface DragState {
  pieceIndex: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  ghostRow: number;
  ghostCol: number;
}

// === STATS / PERSISTENCE ===

export interface PlayerStats {
  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  maxStreak: number;
  attemptDistribution: [number, number, number, number, number, number];
  lastPlayedDate: string;
}

export interface DailyState {
  puzzleNumber: number;
  date: string;
  puzzle: Puzzle;
  attemptHistory: AttemptResult[];
  currentAttempt: number;
  completed: boolean;
  won: boolean;
}

// === CLEAR ANIMATION ===

export interface ClearAnimation {
  cells: CellOffset[];
  progress: number;
}

// === HINT DISPLAY STYLES ===

export type HintStyle = 'outline' | 'fill';

// === CLEAR RESULT ===

export interface ClearResult {
  board: Board;
  clearedRows: number[];
  clearedCols: number[];
}
