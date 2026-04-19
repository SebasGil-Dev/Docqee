import { Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { classNames } from '@/lib/classNames';

type PatientRatingModalProps = {
  appointmentId: string;
  isSubmitting: boolean;
  studentName: string;
  onClose: () => void;
  onSubmit: (appointmentId: string, rating: number, comment?: string) => void;
};

export function PatientRatingModal({
  appointmentId,
  isSubmitting,
  studentName,
  onClose,
  onSubmit,
}: PatientRatingModalProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [comment, setComment] = useState('');
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeStar = hoveredStar || selectedStar;

  function handleSubmit() {
    if (selectedStar === 0 || isSubmitting) return;
    onSubmit(appointmentId, selectedStar, comment.trim() || undefined);
  }

  return (
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      role="dialog"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.38)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Valorar estudiante
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{studentName}</p>
          </div>
          <button
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ghost transition duration-150 hover:bg-slate-100 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="mb-3 text-sm font-medium text-ink-muted">
            ¿Cómo calificarías la atención recibida?
          </p>

          <div className="mb-5 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                className="transition duration-150 focus-visible:outline-none"
                type="button"
                onClick={() => setSelectedStar(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
              >
                <Star
                  aria-hidden="true"
                  className={classNames(
                    'h-9 w-9 transition duration-150',
                    star <= activeStar
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-100 text-slate-300',
                  )}
                />
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="rating-comment">
              Comentario (opcional)
            </label>
            <textarea
              className="admin-scrollbar w-full resize-none rounded-[1rem] border border-slate-200/90 bg-white/98 px-4 py-3 text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.18)] placeholder:text-ghost/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
              id="rating-comment"
              placeholder="Cuéntanos tu experiencia..."
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <button
            className={classNames(
              'w-full rounded-[1.45rem] py-3 text-sm font-semibold transition duration-200',
              selectedStar > 0 && !isSubmitting
                ? 'bg-brand-gradient text-white shadow-[0_14px_36px_-18px_rgba(22,78,99,0.7)] hover:opacity-90'
                : 'cursor-not-allowed bg-slate-100 text-slate-400',
            )}
            disabled={selectedStar === 0 || isSubmitting}
            type="button"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Guardando...' : 'Enviar valoración'}
          </button>
        </div>
      </div>
    </div>
  );
}
