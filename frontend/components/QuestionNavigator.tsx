"use client";
import clsx from "clsx";

interface Props {
  total: number;
  current: number;
  answered: Set<number>;
  onSelect: (n: number) => void;
}

export default function QuestionNavigator({ total, current, answered, onSelect }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Questões</p>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className={clsx(
              "w-8 h-8 rounded text-xs font-medium transition-colors",
              n === current
                ? "bg-[#003087] text-white ring-2 ring-[#003087] ring-offset-1"
                : answered.has(n)
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" />Respondida</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded inline-block" />Pendente</span>
      </div>
    </div>
  );
}
