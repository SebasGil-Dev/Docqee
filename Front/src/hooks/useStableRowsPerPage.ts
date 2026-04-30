import { useCallback, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

type UseStableRowsPerPageOptions<TElement extends HTMLElement> = {
  defaultRowsPerPage: number;
  headerMeasurementRef?: RefObject<HTMLElement | null>;
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
  headerMeasurementRef,
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

    const measuredHeaderHeight =
      headerMeasurementRef?.current?.getBoundingClientRect().height ?? 0;
    const effectiveHeaderHeight =
      measuredHeaderHeight > 0 ? measuredHeaderHeight : headerHeightPx;
    const availableHeight = Math.floor(
      viewport.getBoundingClientRect().height -
        effectiveHeaderHeight -
        heightPaddingPx -
        (rowSafetyBufferPx ?? 8),
    );
    const measuredRows = Array.from(
      rowMeasurementRef?.current?.querySelectorAll('tr') ?? [],
    );
    const measuredRowHeight = measuredRows.reduce((largestHeight, row) => {
      const rowHeight = row.getBoundingClientRect().height;

      return rowHeight > largestHeight ? rowHeight : largestHeight;
    }, 0);
    const effectiveRowHeight = measuredRowHeight > 0 ? measuredRowHeight : rowHeightPx;

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
    headerMeasurementRef,
    headerHeightPx,
    heightPaddingPx,
    minRowsPerPage,
    rowMeasurementRef,
    rowSafetyBufferPx,
    rowHeightPx,
    viewportRef,
  ]);

  useLayoutEffect(() => {
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

      if (headerMeasurementRef?.current) {
        resizeObserver.observe(headerMeasurementRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateRowsPerPage);

    return () => {
      window.removeEventListener('resize', updateRowsPerPage);
    };
  }, [headerMeasurementRef, rowMeasurementRef, updateRowsPerPage, viewportRef]);

  return rowsPerPage;
}
