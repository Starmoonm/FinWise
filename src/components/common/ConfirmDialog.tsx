import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  confirmVariant?: 'danger' | 'warning' | 'primary' | string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  isDestructive,
  confirmVariant,
  onConfirm,
  onCancel,
}) => {
  const effectiveConfirmText = confirmLabel || confirmText || 'Confirm';
  const effectiveDestructive =
    isDestructive !== undefined
      ? isDestructive
      : confirmVariant === 'danger' || confirmVariant === 'destructive';
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              effectiveDestructive
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            {effectiveDestructive ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-sm text-zinc-600 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition ${
              effectiveDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {effectiveConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
