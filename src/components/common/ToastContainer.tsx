import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toast, clearToast } = useFinance();

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-zinc-700/60 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{toast.message}</span>

        {toast.onUndo && (
          <button
            onClick={() => {
              toast.onUndo?.();
              clearToast();
            }}
            className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        )}

        <button
          onClick={clearToast}
          className="p-1 rounded-lg text-zinc-400 hover:text-white transition ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
