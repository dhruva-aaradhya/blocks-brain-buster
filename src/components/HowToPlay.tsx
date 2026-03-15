'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

interface HowToPlayProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}

export default function HowToPlay({ open, onOpenChange, trigger = true }: HowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger
          render={
            <button className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition">
              <HelpCircle size={16} />
              How to Play
            </button>
          }
        />
      )}
      <DialogContent className="glass border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gold text-xl">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-white/80">
          <p>
            <strong className="text-white">Place all 3 blocks</strong> on the 8×8 grid to solve the
            puzzle.
          </p>
          <p>
            Complete a full <strong className="text-white">row or column</strong> to clear it and
            make room for more pieces.
          </p>
          <p>
            The <strong className="text-yellow-300">large block</strong> won&apos;t fit until you
            clear enough space with the two smaller pieces.
          </p>
          <p>
            You have <strong className="text-white">6 attempts</strong>. After each failed attempt,
            you&apos;ll get hints:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-green-400">Green</span> = correct position
            </li>
            <li>
              <span className="text-red-400">Red</span> = wrong position
            </li>
            <li>Order feedback tells you if you placed pieces in the right sequence</li>
          </ul>
          <p className="text-white/50 text-xs pt-1">
            A new puzzle every day — same for everyone!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
