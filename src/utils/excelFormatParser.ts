import ExcelJS from 'exceljs';
import type { CellFormat, MergedCell, SpreadsheetData, BorderStyle } from '@/types/spreadsheet';

function parseArgbColor(argb: string | undefined | null): string | undefined {
  if (!argb) return undefined;
  // ExcelJS ARGB format: "FFRRGGBB" or "AARRGGBB"
  if (argb.length === 8) {
    return `#${argb.substring(2)}`;
  }
  if (argb.length === 6) {
    return `#${argb}`;
  }
  return undefined;
}

function extractColor(color: Partial<ExcelJS.Color> | undefined): string | undefined {
  if (!color) return undefined;
  if (color.argb) return parseArgbColor(color.argb);
  if (color.theme !== undefined) {
    // Map common theme colors
    const themeColors: Record<number, string> = {
      0: '#FFFFFF', // White
      1: '#000000', // Black
      2: '#E7E6E6', // Light Gray
      3: '#44546A', // Dark Blue Gray
      4: '#4472C4', // Blue
      5: '#ED7D31', // Orange
      6: '#A5A5A5', // Gray
      7: '#FFC000', // Gold
      8: '#5B9BD5', // Light Blue
      9: '#70AD47', // Green
    };
    return themeColors[color.theme] || undefined;
  }
  return undefined;
}

function parseBorder(border: Partial<ExcelJS.Border> | undefined): BorderStyle | undefined {
  if (!border || !border.style || (border.style as string) === 'none') return undefined;
  return {
    style: border.style,
    color: extractColor(border.color) || '#000000',
  };
}

function borderToCss(border: BorderStyle | undefined): string {
  if (!border) return 'none';
  const widthMap: Record<string, string> = {
    thin: '1px',
    medium: '2px',
    thick: '3px',
    dotted: '1px',
    dashed: '1px',
    double: '3px',
    hair: '0.5px',
    mediumDashed: '2px',
    dashDot: '1px',
    mediumDashDot: '2px',
    dashDotDot: '1px',
    mediumDashDotDot: '2px',
    slantDashDot: '2px',
  };
  const styleMap: Record<string, string> = {
    thin: 'solid',
    medium: 'solid',
    thick: 'solid',
    dotted: 'dotted',
    dashed: 'dashed',
    double: 'double',
    hair: 'solid',
    mediumDashed: 'dashed',
    dashDot: 'dashed',
    mediumDashDot: 'dashed',
    dashDotDot: 'dotted',
    mediumDashDotDot: 'dotted',
    slantDashDot: 'dashed',
  };
  const width = widthMap[border.style || 'thin'] || '1px';
  const style = styleMap[border.style || 'thin'] || 'solid';
  return `${width} ${style} ${border.color || '#000000'}`;
}

export { borderToCss };

export async function parseExcelWithFormatting(file: File): Promise<SpreadsheetData> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found');
  }

  // Determine actual data range
  const rowCount = worksheet.rowCount;
  const colCount = worksheet.columnCount;

  // Find the actual start position (first non-empty cell)
  let startRow = 0;
  let startCol = 0;
  let foundStart = false;

  for (let r = 1; r <= rowCount && !foundStart; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      if (cell.value !== null && cell.value !== undefined) {
        startRow = r - 1; // 0-indexed
        startCol = c - 1; // 0-indexed
        foundStart = true;
        break;
      }
    }
  }

  // Find the actual start column across all rows
  if (foundStart) {
    for (let r = 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c < startCol + 1; c++) {
        const cell = row.getCell(c);
        if (cell.value !== null && cell.value !== undefined) {
          startCol = c - 1;
        }
      }
    }
  }

  // Total grid size includes offset
  const totalRows = rowCount;
  const totalCols = colCount;

  // Build values and formats arrays (full grid including offset)
  const values: (string | number | null)[][] = [];
  const formats: (CellFormat | null)[][] = [];

  for (let r = 1; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    const rowValues: (string | number | null)[] = [];
    const rowFormats: (CellFormat | null)[] = [];

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);

      // Extract value
      let cellValue: string | number | null = null;
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object') {
          if ('result' in cell.value) {
            // Formula cell - use result
            cellValue = cell.value.result as string | number;
          } else if ('richText' in cell.value) {
            // Rich text
            cellValue = (cell.value as ExcelJS.CellRichTextValue).richText
              .map((rt) => rt.text)
              .join('');
          } else if (cell.value instanceof Date) {
            cellValue = cell.value.toLocaleDateString();
          } else {
            cellValue = String(cell.value);
          }
        } else {
          cellValue = cell.value as string | number;
        }
      }
      rowValues.push(cellValue);

      // Extract formatting
      const format: CellFormat = {};
      let hasFormat = false;

      // Background color
      const fill = cell.fill;
      if (fill && fill.type === 'pattern' && fill.fgColor) {
        const bgColor = extractColor(fill.fgColor);
        if (bgColor) {
          format.bgColor = bgColor;
          hasFormat = true;
        }
      }

      // Font
      const font = cell.font;
      if (font) {
        if (font.color) {
          const textColor = extractColor(font.color);
          if (textColor) {
            format.textColor = textColor;
            hasFormat = true;
          }
        }
        if (font.size) {
          format.fontSize = font.size;
          hasFormat = true;
        }
        if (font.bold) {
          format.bold = true;
          hasFormat = true;
        }
        if (font.italic) {
          format.italic = true;
          hasFormat = true;
        }
        if (font.underline) {
          format.underline = true;
          hasFormat = true;
        }
      }

      // Alignment
      const alignment = cell.alignment;
      if (alignment) {
        if (alignment.horizontal) {
          format.horizontalAlignment = alignment.horizontal as CellFormat['horizontalAlignment'];
          hasFormat = true;
        }
        if (alignment.vertical) {
          format.verticalAlignment = alignment.vertical as CellFormat['verticalAlignment'];
          hasFormat = true;
        }
        if (alignment.wrapText) {
          format.wrapText = true;
          hasFormat = true;
        }
      }

      // Borders
      const border = cell.border;
      if (border) {
        if (border.top) {
          format.borderTop = parseBorder(border.top);
          if (format.borderTop) hasFormat = true;
        }
        if (border.bottom) {
          format.borderBottom = parseBorder(border.bottom);
          if (format.borderBottom) hasFormat = true;
        }
        if (border.left) {
          format.borderLeft = parseBorder(border.left);
          if (format.borderLeft) hasFormat = true;
        }
        if (border.right) {
          format.borderRight = parseBorder(border.right);
          if (format.borderRight) hasFormat = true;
        }
      }

      // Number format
      if (cell.numFmt && cell.numFmt !== 'General') {
        format.numberFormat = cell.numFmt;
        hasFormat = true;
      }

      rowFormats.push(hasFormat ? format : null);
    }

    rowValues.length = totalCols;
    rowFormats.length = totalCols;
    values.push(rowValues);
    formats.push(rowFormats);
  }

  // Extract merged cells
  const mergedCells: MergedCell[] = [];
  // ExcelJS stores merges as string ranges like "A1:B2"
  // Access via worksheet model
  const merges = (worksheet as any)._merges || {};
  for (const key of Object.keys(merges)) {
    const merge = merges[key];
    if (merge && merge.model) {
      mergedCells.push({
        startRow: merge.model.top - 1,
        startCol: merge.model.left - 1,
        endRow: merge.model.bottom - 1,
        endCol: merge.model.right - 1,
      });
    }
  }

  // Extract column widths
  const columnWidths: number[] = [];
  for (let c = 1; c <= totalCols; c++) {
    const col = worksheet.getColumn(c);
    // ExcelJS column width is in characters, convert to approximate pixels
    const charWidth = col.width || 8.43; // default Excel column width
    columnWidths.push(Math.round(charWidth * 7.5)); // approx pixels per character
  }

  // Extract row heights
  const rowHeights: number[] = [];
  for (let r = 1; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    // ExcelJS row height is in points
    const height = row.height || 15; // default Excel row height in points
    rowHeights.push(Math.round(height * 1.33)); // points to pixels
  }

  return {
    values,
    formats,
    mergedCells,
    columnWidths,
    rowHeights,
    rowCount: totalRows,
    colCount: totalCols,
    startRow,
    startCol,
  };
}

// Parse clipboard HTML from Excel paste
export function parseClipboardHtml(html: string): SpreadsheetData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return null;

    const values: (string | number | null)[][] = [];
    const formats: (CellFormat | null)[][] = [];
    const mergedCells: MergedCell[] = [];
    const columnWidths: number[] = [];
    const rowHeights: number[] = [];
    let maxCols = 0;

    // Extract col widths from colgroup
    const cols = table.querySelectorAll('col');
    cols.forEach((col) => {
      const width = col.getAttribute('width');
      if (width) {
        columnWidths.push(parseInt(width, 10));
      }
    });

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      const rowValues: (string | number | null)[] = [];
      const rowFormats: (CellFormat | null)[] = [];

      // Row height from style
      const rowStyle = row.getAttribute('style') || '';
      const heightMatch = rowStyle.match(/height:\s*([\d.]+)(?:px|pt)/);
      if (heightMatch) {
        const unit = rowStyle.includes('pt') ? 1.33 : 1;
        rowHeights.push(Math.round(parseFloat(heightMatch[1]) * unit));
      } else {
        rowHeights.push(20);
      }

      let colIndex = 0;
      cells.forEach((cell) => {
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);

        // Skip cells that are part of a merge
        while (rowValues[colIndex] !== undefined) colIndex++;

        // Value
        const text = cell.textContent?.trim() || null;
        const numVal = text !== null ? Number(text.replace(/[,\s]/g, '')) : NaN;
        const cellValue = text === null ? null : !isNaN(numVal) && text !== '' ? numVal : text;

        // Format from inline style
        const style = (cell as HTMLElement).style;
        const format: CellFormat = {};
        let hasFormat = false;

        if (style.backgroundColor) {
          format.bgColor = style.backgroundColor;
          hasFormat = true;
        }
        if (style.color) {
          format.textColor = style.color;
          hasFormat = true;
        }
        if (style.fontSize) {
          format.fontSize = parseFloat(style.fontSize);
          hasFormat = true;
        }
        if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
          format.bold = true;
          hasFormat = true;
        }
        if (style.fontStyle === 'italic') {
          format.italic = true;
          hasFormat = true;
        }
        if (style.textDecoration?.includes('underline')) {
          format.underline = true;
          hasFormat = true;
        }
        if (style.textAlign) {
          format.horizontalAlignment = style.textAlign as CellFormat['horizontalAlignment'];
          hasFormat = true;
        }
        if (style.verticalAlign) {
          format.verticalAlignment = style.verticalAlign === 'middle' ? 'middle' : style.verticalAlign === 'bottom' ? 'bottom' : 'top';
          hasFormat = true;
        }

        // Parse borders from style
        if (style.borderTop) {
          format.borderTop = { style: 'thin', color: '#000000' };
          hasFormat = true;
        }
        if (style.borderBottom) {
          format.borderBottom = { style: 'thin', color: '#000000' };
          hasFormat = true;
        }
        if (style.borderLeft) {
          format.borderLeft = { style: 'thin', color: '#000000' };
          hasFormat = true;
        }
        if (style.borderRight) {
          format.borderRight = { style: 'thin', color: '#000000' };
          hasFormat = true;
        }

        rowValues[colIndex] = cellValue;
        rowFormats[colIndex] = hasFormat ? format : null;

        // Handle merged cells
        if (colspan > 1 || rowspan > 1) {
          mergedCells.push({
            startRow: rowIndex,
            startCol: colIndex,
            endRow: rowIndex + rowspan - 1,
            endCol: colIndex + colspan - 1,
          });
          // Fill merged area with null
          for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
              if (r === 0 && c === 0) continue;
              if (r === 0) {
                rowValues[colIndex + c] = null;
                rowFormats[colIndex + c] = null;
              }
            }
          }
        }

        colIndex += colspan;
      });

      if (colIndex > maxCols) maxCols = colIndex;
      values.push(rowValues);
      formats.push(rowFormats);
    });

    // Normalize row lengths
    for (let i = 0; i < values.length; i++) {
      while (values[i].length < maxCols) {
        values[i].push(null);
        formats[i].push(null);
      }
    }

    // Fill column widths if not extracted
    while (columnWidths.length < maxCols) {
      columnWidths.push(80);
    }

    return {
      values,
      formats,
      mergedCells,
      columnWidths,
      rowHeights,
      rowCount: values.length,
      colCount: maxCols,
      startRow: 0,
      startCol: 0,
    };
  } catch (e) {
    console.error('Error parsing clipboard HTML:', e);
    return null;
  }
}
