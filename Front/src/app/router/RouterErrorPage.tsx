import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.name === 'ChunkLoadError'
  );
}

export function RouterErrorPage() {
  const error = useRouteError();
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 px-6 py-5 text-center shadow-float">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Docqee</p>
            <p className="mt-2 font-headline text-lg font-extrabold text-ink">Actualizando...</p>
            <p className="mt-1 text-sm text-ink-muted">Se detectó una nueva versión. Recargando la página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 px-6 py-5 text-center shadow-float">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Docqee</p>
          <p className="mt-2 font-headline text-lg font-extrabold text-ink">Algo salió mal</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            className="mt-4 rounded-xl bg-brand-gradient px-5 py-2.5 font-headline text-sm font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            type="button"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
