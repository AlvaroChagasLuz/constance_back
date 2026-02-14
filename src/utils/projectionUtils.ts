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

/**
 * Revenue label patterns in priority order.
 * Each group is tried in order; within a group, any match is accepted.
 */
const REVENUE_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['receita bruta', 'gross revenue'], priority: 1 },
  { labels: ['receita líquida', 'receita liquida', 'net revenue'], priority: 2 },
  { labels: ['revenue', 'receita'], priority: 3 },
];

/**
 * Deductions label patterns in priority order.
 */
const DEDUCTIONS_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['deduções', 'deducoes', 'deductions'], priority: 1 },
  { labels: ['impostos sobre vendas', 'sales taxes'], priority: 2 },
  { labels: ['devoluções', 'devolucoes', 'returns'], priority: 3 },
];

/**
 * Net Revenue label patterns — must match specifically "receita líquida" / "net revenue".
 */
const NET_REVENUE_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['receita líquida', 'receita liquida', 'net revenue'], priority: 1 },
];

/**
 * Find the row index that contains the revenue line item.
 * Searches all rows in the first few columns for matching labels.
 * Returns the row index or null if not found.
 */
export function findRevenueRow(data: SpreadsheetData): number | null {
  const maxLabelCols = Math.min(5, data.colCount);

  // Collect all candidate matches: { row, priority }
  const candidates: { row: number; priority: number }[] = [];

  for (let r = 0; r < data.values.length; r++) {
    const row = data.values[r];
    if (!row) continue;

    for (let c = 0; c < maxLabelCols; c++) {
      const val = row[c];
      if (val == null) continue;

      const cellText = String(val).trim().toLowerCase();
      if (!cellText) continue;

      for (const pattern of REVENUE_PATTERNS) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Return the row with the highest priority (lowest number)
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

/**
 * Detect the number of original (historical) columns by finding the boundary
 * where the original data ended and projection columns begin.
 * This is determined by the original colCount stored before projection.
 */
function findLastHistoricalValue(data: SpreadsheetData, row: number, originalColCount: number): {
  value: number;
  col: number;
} | null {
  // Search backwards from the last original column for a numeric value
  for (let c = originalColCount - 1; c >= 0; c--) {
    const val = data.values[row]?.[c];
    if (val == null) continue;

    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,.\s]/g, (m) => m === ',' ? '' : m));
    if (!isNaN(num) && num !== 0) {
      return { value: num, col: c };
    }
  }
  return null;
}

/**
 * Apply a revenue growth rate to the projection columns of the spreadsheet.
 * 
 * @param data - The current spreadsheet data (with projection columns already added)
 * @param growthRate - The annual growth rate as a percentage (e.g. 10 for 10%)
 * @param originalColCount - The column count before projection columns were added
 * @returns A new SpreadsheetData with revenue values filled in
 */
export function applyRevenueProjection(
  data: SpreadsheetData,
  growthRate: number,
  originalColCount: number
): SpreadsheetData {
  const revenueRow = findRevenueRow(data);
  if (revenueRow === null) {
    return data; // No revenue row found, return unchanged
  }

  const lastHistorical = findLastHistoricalValue(data, revenueRow, originalColCount);
  if (!lastHistorical) {
    return data; // No historical revenue value found
  }

  // Deep clone values
  const newValues = data.values.map(row => [...row]);

  // Apply growth rate to each projection column
  const rate = growthRate / 100;
  let previousValue = lastHistorical.value;

  for (let c = originalColCount; c < data.colCount; c++) {
    const projectedValue = previousValue * (1 + rate);
    // Round to 2 decimal places
    newValues[revenueRow][c] = Math.round(projectedValue * 100) / 100;
    previousValue = projectedValue;
  }

  return {
    ...data,
    values: newValues,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}

/**
 * Find the row index that contains the deductions line item.
 */
export function findDeductionsRow(data: SpreadsheetData): number | null {
  const maxLabelCols = Math.min(5, data.colCount);
  const candidates: { row: number; priority: number }[] = [];

  for (let r = 0; r < data.values.length; r++) {
    const row = data.values[r];
    if (!row) continue;

    for (let c = 0; c < maxLabelCols; c++) {
      const val = row[c];
      if (val == null) continue;

      const cellText = String(val).trim().toLowerCase();
      if (!cellText) continue;

      for (const pattern of DEDUCTIONS_PATTERNS) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

/**
 * Find the row index that contains the net revenue line item.
 */
export function findNetRevenueRow(data: SpreadsheetData): number | null {
  const maxLabelCols = Math.min(5, data.colCount);
  const candidates: { row: number; priority: number }[] = [];

  for (let r = 0; r < data.values.length; r++) {
    const row = data.values[r];
    if (!row) continue;

    for (let c = 0; c < maxLabelCols; c++) {
      const val = row[c];
      if (val == null) continue;

      const cellText = String(val).trim().toLowerCase();
      if (!cellText) continue;

      for (const pattern of NET_REVENUE_PATTERNS) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

/**
 * Apply deductions as a percentage of gross revenue to each projected column.
 * Also computes Net Revenue = Gross Revenue + Deductions (deductions are negative).
 */
export function applyDeductionsProjection(
  data: SpreadsheetData,
  deductionsPercent: number,
  originalColCount: number
): SpreadsheetData {
  const revenueRow = findRevenueRow(data);
  const deductionsRow = findDeductionsRow(data);
  const netRevenueRow = findNetRevenueRow(data);

  if (revenueRow === null || deductionsRow === null) {
    return data;
  }

  // Deep clone values
  const newValues = data.values.map(row => [...row]);

  const rate = deductionsPercent / 100;

  for (let c = originalColCount; c < data.colCount; c++) {
    const revenueVal = newValues[revenueRow][c];
    if (revenueVal == null) continue;

    const revenue = typeof revenueVal === 'number' ? revenueVal : parseFloat(String(revenueVal));
    if (isNaN(revenue)) continue;

    // Deductions are negative in a DRE
    const deduction = Math.round(revenue * rate * 100) / 100;
    newValues[deductionsRow][c] = -deduction;

    // Net Revenue = Gross Revenue + Deductions (deductions already negative)
    if (netRevenueRow !== null) {
      newValues[netRevenueRow][c] = Math.round((revenue - deduction) * 100) / 100;
    }
  }

  return {
    ...data,
    values: newValues,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}

/**
 * COGS / Gross Profit label patterns.
 */
const COGS_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['cmv', 'cogs', 'custo da mercadoria', 'custo das mercadorias', 'custo dos produtos', 'cost of goods'], priority: 1 },
  { labels: ['custo', 'cost'], priority: 2 },
];

const GROSS_PROFIT_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['lucro bruto', 'gross profit'], priority: 1 },
];

const SGA_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['despesas operacionais', 'operating expenses', 'sg&a', 'sga'], priority: 1 },
  { labels: ['despesas', 'expenses'], priority: 2 },
];

const EBITDA_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['ebitda'], priority: 1 },
  { labels: ['lucro operacional', 'operating profit', 'resultado operacional'], priority: 2 },
];

function findRowByPatterns(data: SpreadsheetData, patterns: { labels: string[]; priority: number }[]): number | null {
  const maxLabelCols = Math.min(5, data.colCount);
  const candidates: { row: number; priority: number }[] = [];

  for (let r = 0; r < data.values.length; r++) {
    const row = data.values[r];
    if (!row) continue;

    for (let c = 0; c < maxLabelCols; c++) {
      const val = row[c];
      if (val == null) continue;

      const cellText = String(val).trim().toLowerCase();
      if (!cellText) continue;

      for (const pattern of patterns) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

export function findCOGSRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, COGS_PATTERNS);
}

export function findGrossProfitRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, GROSS_PROFIT_PATTERNS);
}

export function findSGARow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, SGA_PATTERNS);
}

export function findEBITDARow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, EBITDA_PATTERNS);
}

/**
 * Get the projected Gross Profit value for the first projection column.
 */
export function getProjectedGrossProfit(data: SpreadsheetData, originalColCount: number): number | null {
  const grossProfitRow = findGrossProfitRow(data);
  if (grossProfitRow === null) return null;

  const firstProjCol = originalColCount;
  if (firstProjCol >= data.colCount) return null;

  const val = data.values[grossProfitRow]?.[firstProjCol];
  if (val == null) return null;

  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

/**
 * Apply SGA as a percentage of Gross Profit to each projected column.
 * Also computes EBITDA = Gross Profit - SGA.
 */
export function applySGAProjection(
  data: SpreadsheetData,
  sgaPercent: number,
  originalColCount: number
): SpreadsheetData {
  const grossProfitRow = findGrossProfitRow(data);
  const sgaRow = findSGARow(data);
  const ebitdaRow = findEBITDARow(data);

  if (grossProfitRow === null || sgaRow === null) {
    return data;
  }

  const newValues = data.values.map(row => [...row]);
  const rate = sgaPercent / 100;

  for (let c = originalColCount; c < data.colCount; c++) {
    const gpVal = newValues[grossProfitRow][c];
    if (gpVal == null) continue;

    const gp = typeof gpVal === 'number' ? gpVal : parseFloat(String(gpVal));
    if (isNaN(gp)) continue;

    const sga = Math.round(gp * rate * 100) / 100;
    newValues[sgaRow][c] = -sga;

    if (ebitdaRow !== null) {
      newValues[ebitdaRow][c] = Math.round((gp - sga) * 100) / 100;
    }
  }

  return {
    ...data,
    values: newValues,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}

/**
 * D&A / EBIT label patterns.
 */
const DA_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['depreciação e amortização', 'depreciation and amortization', 'd&a'], priority: 1 },
  { labels: ['depreciação', 'depreciation', 'amortização', 'amortization'], priority: 2 },
];

const EBIT_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['lucro antes de juros', 'earnings before interest'], priority: 1 },
  { labels: ['resultado antes', 'lucro operacional líquido'], priority: 2 },
];

export function findDARow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, DA_PATTERNS);
}

/**
 * Find the EBIT row. Uses special logic to match "ebit" but NOT "ebitda".
 */
export function findEBITRow(data: SpreadsheetData): number | null {
  const maxLabelCols = Math.min(5, data.colCount);
  const candidates: { row: number; priority: number }[] = [];

  for (let r = 0; r < data.values.length; r++) {
    const row = data.values[r];
    if (!row) continue;

    for (let c = 0; c < maxLabelCols; c++) {
      const val = row[c];
      if (val == null) continue;

      const cellText = String(val).trim().toLowerCase();
      if (!cellText) continue;

      // Check for exact "ebit" (not "ebitda")
      if (/\bebit\b/i.test(cellText) && !cellText.includes('ebitda')) {
        candidates.push({ row: r, priority: 1 });
      }

      for (const pattern of EBIT_PATTERNS) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

/**
 * Get the projected Net Revenue value for the first projection column.
 */
export function getProjectedNetRevenue(data: SpreadsheetData, originalColCount: number): number | null {
  const netRevenueRow = findNetRevenueRow(data);
  if (netRevenueRow === null) return null;

  const firstProjCol = originalColCount;
  if (firstProjCol >= data.colCount) return null;

  const val = data.values[netRevenueRow]?.[firstProjCol];
  if (val == null) return null;

  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

/**
 * Get the projected EBITDA value for the first projection column.
 */
export function getProjectedEBITDA(data: SpreadsheetData, originalColCount: number): number | null {
  const ebitdaRow = findEBITDARow(data);
  if (ebitdaRow === null) return null;

  const firstProjCol = originalColCount;
  if (firstProjCol >= data.colCount) return null;

  const val = data.values[ebitdaRow]?.[firstProjCol];
  if (val == null) return null;

  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

/**
 * Apply D&A as a percentage of Net Revenue to each projected column.
 * Also computes EBIT = EBITDA - D&A.
 */
export function applyDAProjection(
  data: SpreadsheetData,
  daPercent: number,
  originalColCount: number
): SpreadsheetData {
  const netRevenueRow = findNetRevenueRow(data);
  const daRow = findDARow(data);
  const ebitdaRow = findEBITDARow(data);
  const ebitRow = findEBITRow(data);

  if (netRevenueRow === null || daRow === null) {
    return data;
  }

  const newValues = data.values.map(row => [...row]);
  const rate = daPercent / 100;

  for (let c = originalColCount; c < data.colCount; c++) {
    const netRevVal = newValues[netRevenueRow][c];
    if (netRevVal == null) continue;

    const netRevenue = typeof netRevVal === 'number' ? netRevVal : parseFloat(String(netRevVal));
    if (isNaN(netRevenue)) continue;

    const da = Math.round(netRevenue * rate * 100) / 100;
    newValues[daRow][c] = -da;

    if (ebitRow !== null && ebitdaRow !== null) {
      const ebitdaVal = newValues[ebitdaRow][c];
      if (ebitdaVal != null) {
        const ebitda = typeof ebitdaVal === 'number' ? ebitdaVal : parseFloat(String(ebitdaVal));
        if (!isNaN(ebitda)) {
          newValues[ebitRow][c] = Math.round((ebitda - da) * 100) / 100;
        }
      }
    }
  }

  return {
    ...data,
    values: newValues,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}

/**
 * Apply COGS as a percentage of Net Revenue to each projected column.
 * Also computes Gross Profit = Net Revenue - COGS.
 */
export function applyCOGSProjection(
  data: SpreadsheetData,
  cogsPercent: number,
  originalColCount: number
): SpreadsheetData {
  const netRevenueRow = findNetRevenueRow(data);
  const cogsRow = findCOGSRow(data);
  const grossProfitRow = findGrossProfitRow(data);

  if (netRevenueRow === null || cogsRow === null) {
    return data;
  }

  const newValues = data.values.map(row => [...row]);
  const rate = cogsPercent / 100;

  for (let c = originalColCount; c < data.colCount; c++) {
    const netRevVal = newValues[netRevenueRow][c];
    if (netRevVal == null) continue;

    const netRevenue = typeof netRevVal === 'number' ? netRevVal : parseFloat(String(netRevVal));
    if (isNaN(netRevenue)) continue;

    const cogs = Math.round(netRevenue * rate * 100) / 100;
    newValues[cogsRow][c] = -cogs;

    if (grossProfitRow !== null) {
      newValues[grossProfitRow][c] = Math.round((netRevenue - cogs) * 100) / 100;
    }
  }

  return {
    ...data,
    values: newValues,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}
