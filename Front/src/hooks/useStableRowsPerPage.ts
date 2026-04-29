import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

type UseStableRowsPerPageOptions<TElement extends HTMLElement> = {
  defaultRowsPerPage: number;
  headerHeightPx: number;
  heightPaddingPx?: number;
  minRowsPerPage: number;
  rowMeasurementRef?: RefObject<HTMLElement | null>;
  rowSafetyBufferPx?: number;
  rowHeightPx: number;
  viewportRef: RefObject<TElement | null>;
};

export function useStableRowsPerPage<TElement extends HTMLElement>({
  defaultRowsPerPage,
  headerHeightPx,
  heightPaddingPx = 0,
  minRowsPerPage,
  rowMeasurementRef,
  rowSafetyBufferPx,
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
      heightPaddingPx -
      (rowSafetyBufferPx ?? 8);
    const measuredRows = Array.from(
      rowMeasurementRef?.current?.querySelectorAll('tr') ?? [],
    );
    const measuredRowHeight = measuredRows.reduce((largestHeight, row) => {
      const rowHeight = row.getBoundingClientRect().height;

      return rowHeight > largestHeight ? rowHeight : largestHeight;
    }, 0);
    const effectiveRowHeight = Math.max(rowHeightPx, measuredRowHeight);

    const nextRowsPerPage =
      availableHeight > 0
        ? Math.max(
            minRowsPerPage,
            Math.floor(availableHeight / effectiveRowHeight),
          )
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
    rowMeasurementRef,
    rowSafetyBufferPx,
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

      if (rowMeasurementRef?.current) {
        resizeObserver.observe(rowMeasurementRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateRowsPerPage);

    return () => {
      window.removeEventListener('resize', updateRowsPerPage);
    };
  }, [rowMeasurementRef, updateRowsPerPage, viewportRef]);

  return rowsPerPage;
}
