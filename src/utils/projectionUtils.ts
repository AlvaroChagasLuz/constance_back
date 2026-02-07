import type { SpreadsheetData, CellFormat } from '@/types/spreadsheet';

/**
 * Detect the last year value from the header row of the spreadsheet data.
 * Scans the first few rows for a number that looks like a year (e.g. 2020-2099).
 */
function detectLastYear(data: SpreadsheetData): { year: number; row: number; col: number } | null {
  const maxScanRows = Math.min(5, data.values.length);
  
  // Scan from last column backwards in first rows to find the last year
  for (let r = 0; r < maxScanRows; r++) {
    const row = data.values[r];
    if (!row) continue;
    
    for (let c = row.length - 1; c >= 0; c--) {
      const val = row[c];
      if (val == null) continue;
      
      const str = String(val).trim();
      const num = parseInt(str, 10);
      
      if (num >= 1990 && num <= 2099 && String(num) === str) {
        return { year: num, row: r, col: c };
      }
    }
  }
  
  return null;
}

/**
 * Deep clone a CellFormat object.
 */
function cloneFormat(fmt: CellFormat | null | undefined): CellFormat | null {
  if (!fmt) return null;
  return {
    ...fmt,
    borderTop: fmt.borderTop ? { ...fmt.borderTop } : undefined,
    borderBottom: fmt.borderBottom ? { ...fmt.borderBottom } : undefined,
    borderLeft: fmt.borderLeft ? { ...fmt.borderLeft } : undefined,
    borderRight: fmt.borderRight ? { ...fmt.borderRight } : undefined,
  };
}

/**
 * Add projection year columns to the spreadsheet data.
 * Each new column inherits formatting from the last existing column.
 * Year headers are incremented from the detected last year.
 */
export function addProjectionColumns(data: SpreadsheetData, numYears: number): SpreadsheetData {
  const lastCol = data.colCount - 1;
  const detected = detectLastYear(data);
  
  // Deep clone existing values
  const newValues = data.values.map(row => [...row]);
  
  // Deep clone existing formats
  const newFormats = data.formats
    ? data.formats.map(row => row.map(f => cloneFormat(f)))
    : undefined;
  
  // Clone column widths
  const lastColWidth = data.columnWidths?.[lastCol] ?? 100;
  const newColumnWidths = data.columnWidths ? [...data.columnWidths] : [];
  
  // Clone row heights
  const newRowHeights = data.rowHeights ? [...data.rowHeights] : undefined;
  
  // Clone merged cells (don't extend them into new columns)
  const newMergedCells = data.mergedCells?.map(m => ({ ...m }));
  
  // Add new columns
  for (let y = 0; y < numYears; y++) {
    const newColIndex = data.colCount + y;
    
    // Add column width
    newColumnWidths.push(lastColWidth);
    
    // For each row, copy the last column's value and format
    for (let r = 0; r < newValues.length; r++) {
      // Ensure row has enough columns
      while (newValues[r].length <= newColIndex) {
        newValues[r].push(null);
      }
      
      // Copy format from last column
      if (newFormats) {
        while (newFormats[r].length <= newColIndex) {
          newFormats[r].push(null);
        }
        // Clone the format of the last original column
        const lastFormat = data.formats?.[r]?.[lastCol];
        newFormats[r][newColIndex] = cloneFormat(lastFormat);
      }
      
      // For the year header row, set the incremented year
      if (detected && r === detected.row) {
        newValues[r][newColIndex] = detected.year + y + 1;
      }
      // For non-header rows, leave cells empty (null) - they'll inherit formatting only
    }
  }
  
  return {
    values: newValues,
    formats: newFormats,
    mergedCells: newMergedCells,
    columnWidths: newColumnWidths,
    rowHeights: newRowHeights,
    rowCount: data.rowCount,
    colCount: data.colCount + numYears,
    startRow: data.startRow,
    startCol: data.startCol,
  };
}
