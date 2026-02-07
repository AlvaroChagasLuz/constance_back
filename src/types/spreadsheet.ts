export interface CellFormat {
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  horizontalAlignment?: 'left' | 'center' | 'right' | 'fill' | 'justify';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  borderTop?: BorderStyle;
  borderBottom?: BorderStyle;
  borderLeft?: BorderStyle;
  borderRight?: BorderStyle;
  numberFormat?: string;
  wrapText?: boolean;
}

export interface BorderStyle {
  style?: string;
  color?: string;
}

export interface MergedCell {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SpreadsheetData {
  values: (string | number | null)[][];
  formats?: (CellFormat | null)[][];
  mergedCells?: MergedCell[];
  columnWidths?: number[];
  rowHeights?: number[];
  rowCount: number;
  colCount: number;
  startRow?: number; // row offset (0-indexed) if data doesn't start at row 0
  startCol?: number; // col offset (0-indexed) if data doesn't start at col 0
}
