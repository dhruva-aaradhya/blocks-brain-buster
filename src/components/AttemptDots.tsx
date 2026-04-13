'use client';

import type { AttemptResult, GamePhase } from '@/types/game';
import { motion } from 'framer-motion';

interface AttemptDotsProps {
  currentAttempt: number;
  attemptHistory: AttemptResult[];
  reviewingAttempt: number;
  onDotTap: (index: number) => void;
  phase: GamePhase;
}

export default function AttemptDots({
  currentAttempt,
  attemptHistory,
  reviewingAttempt,
  onDotTap,
  phase,
}: AttemptDotsProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: 6 }, (_, i) => {
          const attemptNum = i + 1;
          const result = attemptHistory[i];
          const isCurrent = attemptNum === currentAttempt && (phase === 'playing' || phase === 'clearing');
          const isReviewing = reviewingAttempt === i;

          let dotClass = 'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ';

          if (isReviewing) {
            dotClass += 'bg-red-500 text-white ring-2 ring-white ring-offset-2 ring-offset-transparent shadow-[0_0_12px_rgba(255,255,255,0.5)]';
          } else if (result?.solved) {
            dotClass += 'bg-green-500 text-white';
          } else if (result) {
            dotClass += 'bg-red-500/80 text-white cursor-pointer active:scale-95';
          } else if (isCurrent) {
            dotClass += 'border-2 border-[#fdd835] text-[#fdd835] shadow-[0_0_8px_#fdd835aa]';
          } else {
            dotClass += 'border border-white/20 text-white/30';
          }

          return (
            <motion.button
              key={i}
              className={dotClass}
              onClick={() => result && !result.solved ? onDotTap(i) : undefined}
              animate={isReviewing ? { scale: 1.3 } : { scale: 1 }}
              whileTap={result && !result.solved ? { scale: 0.9 } : undefined}
            >
              {result?.solved ? '✓' : result ? '✗' : attemptNum}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
