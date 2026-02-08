import { useState, useCallback, useRef, useEffect } from 'react';

type ResizeTarget = 
  | { type: 'column'; index: number; startX: number; startWidth: number }
  | { type: 'row'; index: number; startY: number; startHeight: number };

const MIN_COL_WIDTH = 30;
const MIN_ROW_HEIGHT = 16;

export function useSpreadsheetResize(
  baseColumnWidths: number[],
  baseRowHeights: number[],
) {
  const [colOverrides, setColOverrides] = useState<Record<number, number>>({});
  const [rowOverrides, setRowOverrides] = useState<Record<number, number>>({});
  const resizeRef = useRef<ResizeTarget | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const getColumnWidth = useCallback(
    (index: number) => colOverrides[index] ?? baseColumnWidths[index] ?? 100,
    [colOverrides, baseColumnWidths],
  );

  const getRowHeight = useCallback(
    (index: number) => rowOverrides[index] ?? baseRowHeights[index] ?? 32,
    [rowOverrides, baseRowHeights],
  );

  const effectiveColumnWidths = baseColumnWidths.map((w, i) => colOverrides[i] ?? w);
  const effectiveRowHeights = baseRowHeights.map((h, i) => rowOverrides[i] ?? h);

  const startColumnResize = useCallback(
    (colIndex: number, clientX: number) => {
      const currentWidth = colOverrides[colIndex] ?? baseColumnWidths[colIndex] ?? 100;
      resizeRef.current = {
        type: 'column',
        index: colIndex,
        startX: clientX,
        startWidth: currentWidth,
      };
      setIsResizing(true);
    },
    [colOverrides, baseColumnWidths],
  );

  const startRowResize = useCallback(
    (rowIndex: number, clientY: number) => {
      const currentHeight = rowOverrides[rowIndex] ?? baseRowHeights[rowIndex] ?? 32;
      resizeRef.current = {
        type: 'row',
        index: rowIndex,
        startY: clientY,
        startHeight: currentHeight,
      };
      setIsResizing(true);
    },
    [rowOverrides, baseRowHeights],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = resizeRef.current;
      if (!target) return;
      e.preventDefault();

      if (target.type === 'column') {
        const delta = e.clientX - target.startX;
        const newWidth = Math.max(MIN_COL_WIDTH, target.startWidth + delta);
        setColOverrides((prev) => ({ ...prev, [target.index]: newWidth }));
      } else {
        const delta = e.clientY - target.startY;
        const newHeight = Math.max(MIN_ROW_HEIGHT, target.startHeight + delta);
        setRowOverrides((prev) => ({ ...prev, [target.index]: newHeight }));
      }
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return {
    effectiveColumnWidths,
    effectiveRowHeights,
    getColumnWidth,
    getRowHeight,
    startColumnResize,
    startRowResize,
    isResizing,
    resizeRef,
  };
}
