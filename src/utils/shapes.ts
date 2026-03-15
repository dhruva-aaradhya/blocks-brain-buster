import type { CellOffset, ShapeVariant } from '@/types/game';

const SHAPE_DEFINITIONS = [
  { base: 'Shape_0', variants: ['1'] },
  { base: 'Shape_1', variants: ['01-11', '10-11', '11-10', '11-01'] },
  { base: 'Shape_2', variants: ['1-1', '11'] },
  { base: 'Shape_3', variants: ['1-1-1', '111'] },
  { base: 'Shape_4', variants: ['1-1-1-1', '1111'] },
  { base: 'Shape_5', variants: ['1-1-1-1-1', '11111'] },
  { base: 'Shape_6', variants: ['111-111-111'] },
  { base: 'Shape_7', variants: ['001-001-111', '100-100-111', '111-100-100', '111-001-001'] },
  { base: 'Shape_8', variants: ['010-111', '10-11-10', '111-010', '01-11-01'] },
  { base: 'Shape_9', variants: ['110-011', '01-11-10', '011-110', '10-11-01'] },
  {
    base: 'Shape_10',
    variants: [
      '001-111', '10-10-11', '111-100', '11-01-01',
      '100-111', '11-10-10', '111-001', '01-01-11',
    ],
  },
  { base: 'Shape_11', variants: ['001-010-100', '100-010-001'] },
  { base: 'Shape_12', variants: ['01-10', '10-01'] },
  { base: 'Shape_13', variants: ['11-11'] },
  { base: 'Shape_14', variants: ['111-111', '11-11-11'] },
];

export function parseShape(raw: string): CellOffset[] {
  const cells: CellOffset[] = [];
  const rows = raw.split('-');
  rows.forEach((row, ri) => {
    for (let ci = 0; ci < row.length; ci++) {
      if (row[ci] === '1') cells.push([ri, ci]);
    }
  });
  return cells;
}

export const ALL_VARIANTS: ShapeVariant[] = [];

for (const def of SHAPE_DEFINITIONS) {
  def.variants.forEach((raw, vi) => {
    ALL_VARIANTS.push({
      id: `${def.base}_${vi}`,
      baseShape: def.base,
      variantIndex: vi,
      cells: parseShape(raw),
      raw,
    });
  });
}

function getVariants(...ids: string[]): ShapeVariant[] {
  return ALL_VARIANTS.filter((v) => ids.includes(v.id));
}

function getBaseVariants(...bases: string[]): ShapeVariant[] {
  return ALL_VARIANTS.filter((v) => bases.includes(v.baseShape));
}

// Small shapes: 3-4 cells, creates interesting placement decisions.
// Excluded: 2-cell pieces (trivial), S/Z-tetromino (too recognizable —
// the zigzag silhouette makes gap-matching instinctive).
export const SMALL_SHAPES: ShapeVariant[] = [
  ...getBaseVariants('Shape_1'),                                     // L-triomino (4 rotations)
  ...getBaseVariants('Shape_3'),                                     // I-triomino (2 orientations)
  ...getVariants('Shape_8_0', 'Shape_8_2'),                          // T-tetromino horizontal (2)
  ...getVariants('Shape_10_0', 'Shape_10_2', 'Shape_10_4', 'Shape_10_6'), // J/L-tetromino (4)
];

// Big shapes: need both clears to fit
export const BIG_SHAPES: ShapeVariant[] = [
  ...getBaseVariants('Shape_6'),   // 3x3 block (1)
  ...getBaseVariants('Shape_7'),   // corner/L-pentomino (4)
  ...getBaseVariants('Shape_13'),  // 2x2 square (1)
  ...getBaseVariants('Shape_14'),  // 2x3 rectangle (2)
];
