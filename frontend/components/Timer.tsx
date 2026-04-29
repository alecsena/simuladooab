"use client";
import { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";
import clsx from "clsx";

interface TimerProps {
  startedAt: string;
  duracaoLimite: number; // seconds
  onExpired: () => void;
}

export default function Timer({ startedAt, duracaoLimite, onExpired }: TimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [expired, setExpired] = useState(false);

  const calc = useCallback(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    return Math.max(0, duracaoLimite - elapsed);
  }, [startedAt, duracaoLimite]);

  useEffect(() => {
    setRemaining(calc());
    const interval = setInterval(() => {
      const rem = calc();
      setRemaining(rem);
      if (rem <= 0 && !expired) {
        setExpired(true);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [calc, onExpired, expired]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  const isWarning = remaining < 600; // < 10 min
  const isCritical = remaining < 120; // < 2 min

  return (
    <div className={clsx(
      "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-colors",
      isCritical ? "bg-red-100 text-red-700 animate-pulse" :
      isWarning ? "bg-amber-100 text-amber-700" :
      "bg-gray-100 text-gray-700"
    )}>
      <Clock size={16} />
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
