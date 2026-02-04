import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

interface VirtualizedSpreadsheetProps {
  totalRows?: number;
  totalColumns?: number;
  rowHeight?: number;
  columnWidth?: number;
  rowNumberWidth?: number;
  headerHeight?: number;
  bufferSize?: number;
  children?: React.ReactNode;
  emptyMessage?: React.ReactNode;
}

export const VirtualizedSpreadsheet: React.FC<VirtualizedSpreadsheetProps> = ({
  totalRows = 1000,
  totalColumns = 100,
  rowHeight = 32,
  columnWidth = 100,
  rowNumberWidth = 40,
  headerHeight = 32,
  bufferSize = 5,
  children,
  emptyMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Helper to generate column letters (A, B, C, ... Z, AA, AB, ... CV)
  const getColumnLetter = useCallback((index: number): string => {
    let result = '';
    let n = index;
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
    }
    return result;
  }, []);

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

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleHeight = containerSize.height - headerHeight;
    const visibleWidth = containerSize.width - rowNumberWidth;

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferSize);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + visibleHeight) / rowHeight) + bufferSize
    );

    const startCol = Math.max(0, Math.floor(scrollLeft / columnWidth) - bufferSize);
    const endCol = Math.min(
      totalColumns - 1,
      Math.ceil((scrollLeft + visibleWidth) / columnWidth) + bufferSize
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollTop, scrollLeft, containerSize, rowHeight, columnWidth, headerHeight, rowNumberWidth, bufferSize, totalRows, totalColumns]);

  // Total content size
  const totalHeight = totalRows * rowHeight;
  const totalWidth = totalColumns * columnWidth;

  // Generate visible rows and columns
  const visibleRows = useMemo(() => {
    const rows: number[] = [];
    for (let i = visibleRange.startRow; i <= visibleRange.endRow; i++) {
      rows.push(i);
    }
    return rows;
  }, [visibleRange.startRow, visibleRange.endRow]);

  const visibleColumns = useMemo(() => {
    const cols: number[] = [];
    for (let i = visibleRange.startCol; i <= visibleRange.endCol; i++) {
      cols.push(i);
    }
    return cols;
  }, [visibleRange.startCol, visibleRange.endCol]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto bg-background"
      onScroll={handleScroll}
    >
      {/* Total scrollable area */}
      <div
        style={{
          width: totalWidth + rowNumberWidth,
          height: totalHeight + headerHeight,
          position: 'relative',
        }}
      >
        {/* Fixed top-left corner cell */}
        <div
          className="sticky top-0 left-0 z-30 bg-muted border-r border-b border-border"
          style={{
            width: rowNumberWidth,
            height: headerHeight,
          }}
        />

        {/* Column headers (sticky top) */}
        <div
          className="sticky top-0 z-20 bg-muted"
          style={{
            height: headerHeight,
            marginLeft: rowNumberWidth,
            width: totalWidth,
            position: 'absolute',
            top: 0,
            left: rowNumberWidth,
          }}
        >
          {/* Use position: sticky for the header row container */}
          <div
            className="sticky top-0 flex"
            style={{ 
              position: 'absolute',
              left: 0,
              top: 0,
              height: headerHeight,
            }}
          >
            {visibleColumns.map((colIndex) => (
              <div
                key={colIndex}
                className="border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted"
                style={{
                  position: 'absolute',
                  left: colIndex * columnWidth,
                  width: columnWidth,
                  height: headerHeight,
                }}
              >
                {getColumnLetter(colIndex)}
              </div>
            ))}
          </div>
        </div>

        {/* Row numbers (sticky left) */}
        <div
          className="sticky left-0 z-20"
          style={{
            width: rowNumberWidth,
            height: totalHeight,
            position: 'absolute',
            top: headerHeight,
            left: 0,
          }}
        >
          {visibleRows.map((rowIndex) => (
            <div
              key={rowIndex}
              className="border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted"
              style={{
                position: 'absolute',
                top: rowIndex * rowHeight,
                width: rowNumberWidth,
                height: rowHeight,
              }}
            >
              {rowIndex + 1}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div
          style={{
            position: 'absolute',
            top: headerHeight,
            left: rowNumberWidth,
            width: totalWidth,
            height: totalHeight,
          }}
        >
          {visibleRows.map((rowIndex) =>
            visibleColumns.map((colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="border-r border-b border-border bg-background"
                style={{
                  position: 'absolute',
                  top: rowIndex * rowHeight,
                  left: colIndex * columnWidth,
                  width: columnWidth,
                  height: rowHeight,
                }}
              />
            ))
          )}
        </div>

        {/* Empty message overlay */}
        {emptyMessage && (
          <div
            className="absolute z-10 flex items-center justify-center"
            style={{
              top: headerHeight + rowHeight,
              left: rowNumberWidth + columnWidth,
              width: columnWidth * 3,
              height: rowHeight * 3,
            }}
          >
            {emptyMessage}
          </div>
        )}

        {/* Children overlay for custom content */}
        {children && (
          <div
            className="absolute z-10"
            style={{
              top: headerHeight,
              left: rowNumberWidth,
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
