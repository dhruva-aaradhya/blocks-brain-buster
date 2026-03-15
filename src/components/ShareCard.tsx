'use client';

import type { Puzzle, AttemptResult } from '@/types/game';

export function generateShareText(
  puzzle: Puzzle,
  attemptHistory: AttemptResult[],
  won: boolean
): string {
  const header = `Blocks Brain Buster #${puzzle.puzzleNumber} 🧩`;
  const result = won
    ? `Solved: ${attemptHistory.length}/6`
    : `Failed: X/6`;

  const lines = attemptHistory.map((attempt) => {
    const smallPlacements = attempt.placementHints;
    const squares = smallPlacements
      .map((h) => (h.correct ? '🟩' : '🟥'))
      .join('');
    const status = attempt.solved ? ' ✅' : ' ❌';
    return `${attempt.placements.length > 0 ? squares : '⬜'}${status}`;
  });

  return `${header}\n${result}\n\n${lines.join('\n')}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      window.prompt('Copy this text:', text);
      return false;
    }
  }
}
