import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Grid, GridImperativeAPI } from 'react-window';

interface VirtualizedSpreadsheetProps {
  totalRows?: number;
  totalColumns?: number;
  rowHeight?: number;
  columnWidth?: number;
  rowNumberWidth?: number;
  headerHeight?: number;
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

// Empty cell props type
type EmptyCellProps = Record<string, never>;

// Cell component for the grid
const Cell = ({ 
  style 
}: {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  ariaAttributes: object;
}) => (
  <div
    style={style}
    className="border-r border-b border-border bg-background"
  />
);

export const VirtualizedSpreadsheet: React.FC<VirtualizedSpreadsheetProps> = ({
  totalRows = 1000,
  totalColumns = 100,
  rowHeight = 32,
  columnWidth = 100,
  rowNumberWidth = 40,
  headerHeight = 32,
  emptyMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridImperativeAPI>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });

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

  // Attach scroll listener to the grid's outer element
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
  }, [containerSize]); // Re-attach when container size changes (grid mounts)

  // Calculate visible ranges with buffer
  const visibleRowStart = useMemo(() => 
    Math.max(0, Math.floor(scrollPosition.top / rowHeight) - 5),
    [scrollPosition.top, rowHeight]
  );
  
  const visibleRowEnd = useMemo(() => 
    Math.min(totalRows - 1, Math.ceil((scrollPosition.top + containerSize.height - headerHeight) / rowHeight) + 5),
    [scrollPosition.top, containerSize.height, headerHeight, rowHeight, totalRows]
  );

  const visibleColStart = useMemo(() => 
    Math.max(0, Math.floor(scrollPosition.left / columnWidth) - 5),
    [scrollPosition.left, columnWidth]
  );
  
  const visibleColEnd = useMemo(() => 
    Math.min(totalColumns - 1, Math.ceil((scrollPosition.left + containerSize.width - rowNumberWidth) / columnWidth) + 5),
    [scrollPosition.left, containerSize.width, rowNumberWidth, columnWidth, totalColumns]
  );

  const gridWidth = containerSize.width - rowNumberWidth;
  const gridHeight = containerSize.height - headerHeight;

  // Generate visible column headers
  const columnHeaders = useMemo(() => {
    const headers = [];
    for (let i = visibleColStart; i <= visibleColEnd; i++) {
      headers.push(
        <div
          key={i}
          className="absolute border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted"
          style={{
            left: i * columnWidth,
            width: columnWidth,
            height: headerHeight,
          }}
        >
          {getColumnLetter(i)}
        </div>
      );
    }
    return headers;
  }, [visibleColStart, visibleColEnd, columnWidth, headerHeight]);

  // Generate visible row numbers
  const rowNumbers = useMemo(() => {
    const numbers = [];
    for (let i = visibleRowStart; i <= visibleRowEnd; i++) {
      numbers.push(
        <div
          key={i}
          className="absolute border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted"
          style={{
            top: i * rowHeight,
            width: rowNumberWidth,
            height: rowHeight,
          }}
        >
          {i + 1}
        </div>
      );
    }
    return numbers;
  }, [visibleRowStart, visibleRowEnd, rowHeight, rowNumberWidth]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-background">
      {containerSize.width > 0 && containerSize.height > 0 && (
        <>
          {/* Fixed corner cell */}
          <div
            className="absolute top-0 left-0 z-30 bg-muted border-r border-b border-border"
            style={{ width: rowNumberWidth, height: headerHeight }}
          />

          {/* Column headers (horizontal scroll synced) */}
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
                width: totalColumns * columnWidth,
                height: headerHeight,
                transform: `translateX(-${scrollPosition.left}px)`,
              }}
            >
              {columnHeaders}
            </div>
          </div>

          {/* Row numbers (vertical scroll synced) */}
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
                height: totalRows * rowHeight,
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
            <Grid<EmptyCellProps>
              gridRef={gridRef}
              cellComponent={Cell}
              cellProps={{} as EmptyCellProps}
              columnCount={totalColumns}
              columnWidth={columnWidth}
              rowCount={totalRows}
              rowHeight={rowHeight}
              overscanCount={5}
              style={{ width: gridWidth, height: gridHeight }}
            />
          </div>

          {/* Empty message overlay */}
          {emptyMessage && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                top: headerHeight + rowHeight * 2,
                left: rowNumberWidth + columnWidth,
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
