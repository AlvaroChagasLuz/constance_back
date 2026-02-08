import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Grid, GridImperativeAPI } from 'react-window';
import type { SpreadsheetData, CellFormat, MergedCell } from '@/types/spreadsheet';
import { borderToCss } from '@/utils/excelFormatParser';
import { useSpreadsheetResize } from '@/hooks/useSpreadsheetResize';

// Re-export SpreadsheetData for backward compatibility
export type { SpreadsheetData } from '@/types/spreadsheet';

interface VirtualizedSpreadsheetProps {
  totalRows?: number;
  totalColumns?: number;
  data?: SpreadsheetData | null;
  emptyMessage?: React.ReactNode;
}

// Helper to generate column letters (A, B, C, ... Z, AA, AB, ... CV)
const getColumnLetter = (index: number): string => {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

// Build a lookup set for cells that are hidden (part of a merge but not the top-left)
function buildMergedCellMap(mergedCells?: MergedCell[]): {
  hidden: Set<string>;
  spans: Map<string, { rowSpan: number; colSpan: number }>;
} {
  const hidden = new Set<string>();
  const spans = new Map<string, { rowSpan: number; colSpan: number }>();

  if (!mergedCells) return { hidden, spans };

  for (const merge of mergedCells) {
    spans.set(`${merge.startRow},${merge.startCol}`, {
      rowSpan: merge.endRow - merge.startRow + 1,
      colSpan: merge.endCol - merge.startCol + 1,
    });
    for (let r = merge.startRow; r <= merge.endRow; r++) {
      for (let c = merge.startCol; c <= merge.endCol; c++) {
        if (r !== merge.startRow || c !== merge.startCol) {
          hidden.add(`${r},${c}`);
        }
      }
    }
  }
  return { hidden, spans };
}

interface CellData {
  spreadsheetData: SpreadsheetData | null;
  mergedHidden: Set<string>;
  mergedSpans: Map<string, { rowSpan: number; colSpan: number }>;
  columnWidths: number[];
  rowHeights: number[];
}

// Cell component for the grid
const Cell = ({
  style,
  rowIndex,
  columnIndex,
  spreadsheetData,
  mergedHidden,
  mergedSpans,
  columnWidths,
  rowHeights,
}: {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  ariaAttributes: object;
} & CellData) => {
  const key = `${rowIndex},${columnIndex}`;

  // Skip hidden merged cells
  if (mergedHidden.has(key)) {
    return null;
  }

  const cellValue = spreadsheetData?.values?.[rowIndex]?.[columnIndex];
  const cellFormat = spreadsheetData?.formats?.[rowIndex]?.[columnIndex];
  const displayValue = cellValue != null ? String(cellValue) : '';

  // Build cell style with formatting
  const cellStyle: React.CSSProperties = { ...style };

  // Handle merged cell spans
  const span = mergedSpans.get(key);
  if (span) {
    let totalWidth = 0;
    for (let c = columnIndex; c < columnIndex + span.colSpan; c++) {
      totalWidth += columnWidths[c] || 100;
    }
    let totalHeight = 0;
    for (let r = rowIndex; r < rowIndex + span.rowSpan; r++) {
      totalHeight += rowHeights[r] || 32;
    }
    cellStyle.width = totalWidth;
    cellStyle.height = totalHeight;
    cellStyle.zIndex = 2;
  }

  if (cellFormat) {
    if (cellFormat.bgColor) {
      cellStyle.backgroundColor = cellFormat.bgColor;
    }
    if (cellFormat.textColor) {
      cellStyle.color = cellFormat.textColor;
    }
    if (cellFormat.fontSize) {
      cellStyle.fontSize = `${cellFormat.fontSize}pt`;
    }
    if (cellFormat.bold) {
      cellStyle.fontWeight = 'bold';
    }
    if (cellFormat.italic) {
      cellStyle.fontStyle = 'italic';
    }
    if (cellFormat.underline) {
      cellStyle.textDecoration = 'underline';
    }
    if (cellFormat.horizontalAlignment) {
      const alignMap: Record<string, React.CSSProperties['justifyContent']> = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
        fill: 'stretch',
        justify: 'space-between',
      };
      cellStyle.justifyContent = alignMap[cellFormat.horizontalAlignment] || 'flex-start';
    }
    if (cellFormat.verticalAlignment) {
      const vAlignMap: Record<string, React.CSSProperties['alignItems']> = {
        top: 'flex-start',
        middle: 'center',
        bottom: 'flex-end',
      };
      cellStyle.alignItems = vAlignMap[cellFormat.verticalAlignment] || 'center';
    }
    if (cellFormat.wrapText) {
      cellStyle.whiteSpace = 'normal';
      cellStyle.wordWrap = 'break-word';
    }

    // Borders - override default
    if (cellFormat.borderTop) {
      cellStyle.borderTop = borderToCss(cellFormat.borderTop);
    }
    if (cellFormat.borderBottom) {
      cellStyle.borderBottom = borderToCss(cellFormat.borderBottom);
    }
    if (cellFormat.borderLeft) {
      cellStyle.borderLeft = borderToCss(cellFormat.borderLeft);
    }
    if (cellFormat.borderRight) {
      cellStyle.borderRight = borderToCss(cellFormat.borderRight);
    }
  }

  return (
    <div
      style={cellStyle}
      className={`border-r border-b border-border px-2 flex items-center text-xs overflow-hidden ${
        !cellFormat?.bgColor ? 'bg-background' : ''
      }`}
      title={displayValue}
    >
      <span className={cellFormat?.wrapText ? '' : 'truncate'}>{displayValue}</span>
    </div>
  );
};

// Resize handle width/height in pixels
const HANDLE_SIZE = 5;

export const VirtualizedSpreadsheet: React.FC<VirtualizedSpreadsheetProps> = ({
  totalRows = 1000,
  totalColumns = 100,
  data = null,
  emptyMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridImperativeAPI>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });

  const rowNumberWidth = 40;
  const headerHeight = 32;

  // Calculate actual grid dimensions
  const actualRows = data ? Math.max(data.rowCount, 20) : totalRows;
  const actualColumns = data ? Math.max(data.colCount, 10) : totalColumns;

  // Base column widths and row heights from data or defaults
  const baseColumnWidths = useMemo(() => {
    const widths = data?.columnWidths ? [...data.columnWidths] : [];
    while (widths.length < actualColumns) {
      widths.push(100);
    }
    return widths.slice(0, actualColumns);
  }, [data?.columnWidths, actualColumns]);

  const baseRowHeights = useMemo(() => {
    const heights = data?.rowHeights ? [...data.rowHeights] : [];
    while (heights.length < actualRows) {
      heights.push(32);
    }
    return heights.slice(0, actualRows);
  }, [data?.rowHeights, actualRows]);

  // Resize hook
  const {
    effectiveColumnWidths: columnWidths,
    effectiveRowHeights: rowHeights,
    getColumnWidth,
    getRowHeight,
    startColumnResize,
    startRowResize,
    isResizing,
  } = useSpreadsheetResize(baseColumnWidths, baseRowHeights);

  // Precompute cumulative offsets for variable-size columns/rows
  const colOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < columnWidths.length; i++) {
      offsets.push(offsets[i] + columnWidths[i]);
    }
    return offsets;
  }, [columnWidths]);

  const rowOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < rowHeights.length; i++) {
      offsets.push(offsets[i] + rowHeights[i]);
    }
    return offsets;
  }, [rowHeights]);

  const totalGridWidth = colOffsets[colOffsets.length - 1] || 0;
  const totalGridHeight = rowOffsets[rowOffsets.length - 1] || 0;

  // Merged cells map
  const { hidden: mergedHidden, spans: mergedSpans } = useMemo(
    () => buildMergedCellMap(data?.mergedCells),
    [data?.mergedCells]
  );

  // Update container size on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Scroll listener
  useEffect(() => {
    const gridElement = gridRef.current?.element;
    if (!gridElement) return;

    const handleScroll = () => {
      setScrollPosition({
        left: gridElement.scrollLeft,
        top: gridElement.scrollTop,
      });
    };

    gridElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => gridElement.removeEventListener('scroll', handleScroll);
  }, [containerSize]);

  // The Grid re-renders when getColWidthForGrid / getRowHeightForGrid references change.

  // Calculate visible ranges with buffer
  const visibleColStart = useMemo(() => {
    let i = 0;
    while (i < colOffsets.length - 1 && colOffsets[i + 1] < scrollPosition.left) i++;
    return Math.max(0, i - 5);
  }, [scrollPosition.left, colOffsets]);

  const visibleColEnd = useMemo(() => {
    const rightEdge = scrollPosition.left + containerSize.width - rowNumberWidth;
    let i = visibleColStart;
    while (i < colOffsets.length - 1 && colOffsets[i] < rightEdge) i++;
    return Math.min(actualColumns - 1, i + 5);
  }, [scrollPosition.left, containerSize.width, rowNumberWidth, visibleColStart, colOffsets, actualColumns]);

  const visibleRowStart = useMemo(() => {
    let i = 0;
    while (i < rowOffsets.length - 1 && rowOffsets[i + 1] < scrollPosition.top) i++;
    return Math.max(0, i - 5);
  }, [scrollPosition.top, rowOffsets]);

  const visibleRowEnd = useMemo(() => {
    const bottomEdge = scrollPosition.top + containerSize.height - headerHeight;
    let i = visibleRowStart;
    while (i < rowOffsets.length - 1 && rowOffsets[i] < bottomEdge) i++;
    return Math.min(actualRows - 1, i + 5);
  }, [scrollPosition.top, containerSize.height, headerHeight, visibleRowStart, rowOffsets, actualRows]);

  const gridWidth = containerSize.width - rowNumberWidth;
  const gridHeight = containerSize.height - headerHeight;

  // Column header resize handler
  const handleColumnResizeMouseDown = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startColumnResize(colIndex, e.clientX);
    },
    [startColumnResize]
  );

  // Row resize handler
  const handleRowResizeMouseDown = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startRowResize(rowIndex, e.clientY);
    },
    [startRowResize]
  );

  // Column headers with resize handles
  const columnHeaders = useMemo(() => {
    const headers = [];
    for (let i = visibleColStart; i <= visibleColEnd; i++) {
      headers.push(
        <div
          key={i}
          className="absolute border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted select-none"
          style={{
            left: colOffsets[i],
            width: columnWidths[i],
            height: headerHeight,
          }}
        >
          {getColumnLetter(i)}
          {/* Resize handle on right edge */}
          <div
            className="absolute top-0 right-0 h-full hover:bg-primary/40 transition-colors"
            style={{ width: HANDLE_SIZE, cursor: 'col-resize', zIndex: 5 }}
            onMouseDown={(e) => handleColumnResizeMouseDown(i, e)}
          />
        </div>
      );
    }
    return headers;
  }, [visibleColStart, visibleColEnd, colOffsets, columnWidths, headerHeight, handleColumnResizeMouseDown]);

  // Row numbers with resize handles
  const rowNumbers = useMemo(() => {
    const numbers = [];
    for (let i = visibleRowStart; i <= visibleRowEnd; i++) {
      numbers.push(
        <div
          key={i}
          className="absolute border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted select-none"
          style={{
            top: rowOffsets[i],
            width: rowNumberWidth,
            height: rowHeights[i],
          }}
        >
          {i + 1}
          {/* Resize handle on bottom edge */}
          <div
            className="absolute bottom-0 left-0 w-full hover:bg-primary/40 transition-colors"
            style={{ height: HANDLE_SIZE, cursor: 'row-resize', zIndex: 5 }}
            onMouseDown={(e) => handleRowResizeMouseDown(i, e)}
          />
        </div>
      );
    }
    return numbers;
  }, [visibleRowStart, visibleRowEnd, rowOffsets, rowHeights, rowNumberWidth, handleRowResizeMouseDown]);

  // Cell props
  const cellProps = useMemo<CellData>(
    () => ({
      spreadsheetData: data,
      mergedHidden,
      mergedSpans,
      columnWidths,
      rowHeights,
    }),
    [data, mergedHidden, mergedSpans, columnWidths, rowHeights]
  );

  // Variable-size getters for the Grid
  const getColWidthForGrid = useMemo(
    () => (index: number) => getColumnWidth(index),
    [getColumnWidth]
  );
  const getRowHeightForGrid = useMemo(
    () => (index: number) => getRowHeight(index),
    [getRowHeight]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-background"
      style={isResizing ? { cursor: 'grabbing', userSelect: 'none' } : undefined}
    >
      {containerSize.width > 0 && containerSize.height > 0 && (
        <>
          {/* Fixed corner cell */}
          <div
            className="absolute top-0 left-0 z-30 bg-muted border-r border-b border-border"
            style={{ width: rowNumberWidth, height: headerHeight }}
          />

          {/* Column headers */}
          <div
            className="absolute top-0 z-20 overflow-hidden"
            style={{
              left: rowNumberWidth,
              width: gridWidth,
              height: headerHeight,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: totalGridWidth,
                height: headerHeight,
                transform: `translateX(-${scrollPosition.left}px)`,
              }}
            >
              {columnHeaders}
            </div>
          </div>

          {/* Row numbers */}
          <div
            className="absolute left-0 z-20 overflow-hidden"
            style={{
              top: headerHeight,
              width: rowNumberWidth,
              height: gridHeight,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: rowNumberWidth,
                height: totalGridHeight,
                transform: `translateY(-${scrollPosition.top}px)`,
              }}
            >
              {rowNumbers}
            </div>
          </div>

          {/* Main virtualized grid */}
          <div
            className="absolute"
            style={{
              top: headerHeight,
              left: rowNumberWidth,
              width: gridWidth,
              height: gridHeight,
            }}
          >
            <Grid<CellData>
              gridRef={gridRef}
              cellComponent={Cell}
              cellProps={cellProps}
              columnCount={actualColumns}
              columnWidth={getColWidthForGrid}
              rowCount={actualRows}
              rowHeight={getRowHeightForGrid}
              overscanCount={5}
              style={{ width: gridWidth, height: gridHeight }}
            />
          </div>

          {/* Empty message overlay */}
          {emptyMessage && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                top: headerHeight + 64,
                left: rowNumberWidth + 100,
              }}
            >
              {emptyMessage}
            </div>
          )}
        </>
      )}
    </div>
  );
};
