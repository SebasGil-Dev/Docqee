import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

type UseStableRowsPerPageOptions<TElement extends HTMLElement> = {
  defaultRowsPerPage: number;
  headerHeightPx: number;
  heightPaddingPx?: number;
  minRowsPerPage: number;
  rowHeightPx: number;
  viewportRef: RefObject<TElement | null>;
};

export function useStableRowsPerPage<TElement extends HTMLElement>({
  defaultRowsPerPage,
  headerHeightPx,
  heightPaddingPx = 0,
  minRowsPerPage,
  rowHeightPx,
  viewportRef,
}: UseStableRowsPerPageOptions<TElement>) {
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const updateRowsPerPage = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const availableHeight =
      Math.floor(viewport.getBoundingClientRect().height) -
      headerHeightPx -
      heightPaddingPx;

    const nextRowsPerPage =
      availableHeight > 0
        ? Math.max(minRowsPerPage, Math.floor(availableHeight / rowHeightPx))
        : defaultRowsPerPage;

    setRowsPerPage((currentRowsPerPage) =>
      currentRowsPerPage === nextRowsPerPage
        ? currentRowsPerPage
        : nextRowsPerPage,
    );
  }, [
    defaultRowsPerPage,
    headerHeightPx,
    heightPaddingPx,
    minRowsPerPage,
    rowHeightPx,
    viewportRef,
  ]);

  useEffect(() => {
    updateRowsPerPage();

    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateRowsPerPage);
      resizeObserver.observe(viewport);

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateRowsPerPage);

    return () => {
      window.removeEventListener('resize', updateRowsPerPage);
    };
  }, [updateRowsPerPage, viewportRef]);

  return rowsPerPage;
}
