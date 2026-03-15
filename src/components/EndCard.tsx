'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Puzzle, AttemptResult } from '@/types/game';
import { generateShareText, copyToClipboard } from './ShareCard';

interface EndCardProps {
  won: boolean;
  puzzle: Puzzle;
  attemptHistory: AttemptResult[];
  currentAttempt: number;
  onBack: () => void;
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#fdd835', '#4caf50', '#e53935', '#1e88e5', '#ff9800', '#9c27b0'];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; vr: number; life: number;
    }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.vx *= 0.99;
        p.rotation += p.vr;
        p.life -= 0.008;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive) animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

export default function EndCard({
  won,
  puzzle,
  attemptHistory,
  currentAttempt,
  onBack,
}: EndCardProps) {
  const [copied, setCopied] = useState(false);
  const shareText = generateShareText(puzzle, attemptHistory, won);

  const handleShare = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const solution = puzzle.solution;

  return (
    <>
      {won && <Confetti />}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div className="glass rounded-2xl p-6 max-w-sm w-full text-center space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
          {won ? (
            <>
              <div className="text-4xl">🧩</div>
              <h2 className="text-gold text-2xl font-bold">Solved!</h2>
              <p className="text-white/70">
                Solved in {currentAttempt}/6 attempt{currentAttempt > 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">💀</div>
              <h2 className="text-red-400 text-2xl font-bold">Game Over</h2>
              <p className="text-white/70">Better luck next time!</p>
              <div className="text-left text-xs text-white/50 space-y-1 bg-black/20 rounded-lg p-3">
                <p className="text-white/70 font-medium mb-1">Solution:</p>
                {solution.steps.map((step, i) => (
                  <p key={i}>
                    {i + 1}. <span className="text-white/80">{step.piece.role === 'big' ? 'Big piece' : `Piece ${i + 1}`}</span>{' '}
                    at row {step.row}, col {step.col}
                  </p>
                ))}
              </div>
            </>
          )}

          <div className="bg-black/30 rounded-lg p-3 text-left font-mono text-sm text-white/80 whitespace-pre-line">
            {shareText}
          </div>

          <button
            onClick={handleShare}
            className="w-full btn-game"
          >
            {copied ? 'Copied!' : 'Share Result'}
          </button>

          <button
            onClick={onBack}
            className="w-full text-white/50 hover:text-white text-sm py-2"
          >
            Back to Lobby
          </button>
        </div>
      </motion.div>
    </>
  );
}
