import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, X } from 'lucide-react';

import { classNames } from '@/lib/classNames';

type AdminConfirmationDialogProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  icon?: LucideIcon;
  isOpen: boolean;
  isSubmitting?: boolean;
  title: string;
  tone?: 'danger' | 'primary';
  onCancel: () => void;
  onConfirm: () => void;
};

export function AdminConfirmationDialog({
  cancelLabel = 'No, volver',
  confirmLabel,
  description,
  icon: Icon = AlertTriangle,
  isOpen,
  isSubmitting = false,
  title,
  tone = 'primary',
  onCancel,
  onConfirm,
}: AdminConfirmationDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Cerrar confirmación"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        type="button"
        onClick={onCancel}
      />
      <div
        aria-describedby="admin-confirmation-description"
        aria-modal="true"
        aria-labelledby="admin-confirmation-title"
        className="relative w-full max-w-md overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)]"
        role="dialog"
      >
        <div className="absolute right-4 top-4">
          <button
            aria-label="Cerrar confirmación"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            type="button"
            onClick={onCancel}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7">
          <div
            className={classNames(
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              tone === 'danger'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-primary/10 text-primary',
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="mt-4 space-y-2">
            <h3
              className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink"
              id="admin-confirmation-title"
            >
              {title}
            </h3>
            <p className="text-sm leading-6 text-ink-muted" id="admin-confirmation-description">
              {description}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              disabled={isSubmitting}
              type="button"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              className={classNames(
                'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white transition duration-200 focus-visible:outline-none focus-visible:ring-4',
                tone === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-200'
                  : 'bg-brand-gradient hover:brightness-110 focus-visible:ring-primary/15',
              )}
              disabled={isSubmitting}
              type="button"
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
