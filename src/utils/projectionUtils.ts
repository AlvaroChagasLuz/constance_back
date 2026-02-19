import type { SpreadsheetData, CellFormat } from '@/types/spreadsheet';

/**
 * Helper: Convert column index (0-based) to Excel column letter (A, B, ..., Z, AA, AB, ...).
 */
function colLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * Helper: Build an Excel-style cell reference like "G5".
 * row and col are 0-indexed; Excel is 1-indexed for rows.
 */
function cellRef(row: number, col: number): string {
  return `${colLetter(col)}${row + 1}`;
}

/**
 * Detect the last year value from the header row of the spreadsheet data.
 */
function detectLastYear(data: SpreadsheetData): { year: number; row: number; col: number } | null {
  const maxScanRows = Math.min(5, data.values.length);
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
 * Clone values + formulas arrays from data, returning mutable copies.
 */
function cloneDataArrays(data: SpreadsheetData) {
  const newValues = data.values.map(row => [...row]);
  const newFormulas: (string | null)[][] = data.formulas
    ? data.formulas.map(row => [...row])
    : data.values.map(row => row.map(() => null));
  return { newValues, newFormulas };
}

/**
 * Build a cloned SpreadsheetData result with new values and formulas.
 */
function buildResult(
  data: SpreadsheetData,
  newValues: (string | number | null)[][],
  newFormulas: (string | null)[][]
): SpreadsheetData {
  return {
    ...data,
    values: newValues,
    formulas: newFormulas,
    formats: data.formats?.map(row => row.map(f => cloneFormat(f))),
    mergedCells: data.mergedCells?.map(m => ({ ...m })),
    columnWidths: data.columnWidths ? [...data.columnWidths] : undefined,
    rowHeights: data.rowHeights ? [...data.rowHeights] : undefined,
  };
}

/**
 * Add projection year columns to the spreadsheet data.
 */
export function addProjectionColumns(data: SpreadsheetData, numYears: number): SpreadsheetData {
  const lastCol = data.colCount - 1;
  const detected = detectLastYear(data);

  const newValues = data.values.map(row => [...row]);
  const newFormats = data.formats
    ? data.formats.map(row => row.map(f => cloneFormat(f)))
    : undefined;
  const newFormulas: (string | null)[][] = data.formulas
    ? data.formulas.map(row => [...row])
    : data.values.map(row => row.map(() => null));

  const lastColWidth = data.columnWidths?.[lastCol] ?? 100;
  const newColumnWidths = data.columnWidths ? [...data.columnWidths] : [];
  const newRowHeights = data.rowHeights ? [...data.rowHeights] : undefined;
  const newMergedCells = data.mergedCells?.map(m => ({ ...m }));

  for (let y = 0; y < numYears; y++) {
    const newColIndex = data.colCount + y;
    newColumnWidths.push(lastColWidth);

    for (let r = 0; r < newValues.length; r++) {
      while (newValues[r].length <= newColIndex) {
        newValues[r].push(null);
      }
      while (newFormulas[r].length <= newColIndex) {
        newFormulas[r].push(null);
      }
      if (newFormats) {
        while (newFormats[r].length <= newColIndex) {
          newFormats[r].push(null);
        }
        const lastFormat = data.formats?.[r]?.[lastCol];
        newFormats[r][newColIndex] = cloneFormat(lastFormat);
      }
      if (detected && r === detected.row) {
        newValues[r][newColIndex] = detected.year + y + 1;
      }
    }
  }

  return {
    values: newValues,
    formulas: newFormulas,
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

// ==================== Row pattern definitions ====================

const REVENUE_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['receita bruta', 'gross revenue'], priority: 1 },
  { labels: ['receita líquida', 'receita liquida', 'net revenue'], priority: 2 },
  { labels: ['revenue', 'receita'], priority: 3 },
];

const DEDUCTIONS_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['deduções', 'deducoes', 'deductions'], priority: 1 },
  { labels: ['impostos sobre vendas', 'sales taxes'], priority: 2 },
  { labels: ['devoluções', 'devolucoes', 'returns'], priority: 3 },
];

const NET_REVENUE_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['receita líquida', 'receita liquida', 'net revenue'], priority: 1 },
];

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

const DA_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['depreciação e amortização', 'depreciation and amortization', 'd&a'], priority: 1 },
  { labels: ['depreciação', 'depreciation', 'amortização', 'amortization'], priority: 2 },
];

const EBIT_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['lucro antes de juros', 'earnings before interest'], priority: 1 },
  { labels: ['resultado antes', 'lucro operacional líquido'], priority: 2 },
];

const FINANCIAL_RESULT_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['resultado financeiro', 'financial result', 'financial revenue'], priority: 1 },
  { labels: ['receita financeira', 'despesa financeira'], priority: 2 },
];

const EBT_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['ebt', 'lucro antes do imposto', 'earnings before taxes'], priority: 1 },
  { labels: ['lucro antes do ir', 'receita pré imposto'], priority: 2 },
];

const TAX_PATTERNS: { labels: string[]; priority: number; excludes?: string[] }[] = [
  { labels: ['imposto de renda', 'ir/csll', 'irpj', 'income tax'], priority: 1 },
  { labels: ['impostos sobre o lucro', 'impostos sobre lucro', 'tax on profit'], priority: 2 },
  { labels: ['imposto', 'impostos', 'tax'], priority: 3, excludes: ['sobre vendas', 'sobre receita', 'sobre faturamento', 'sales tax', 'antes do imposto', 'before tax', 'ebt'] },
];

const NET_INCOME_PATTERNS: { labels: string[]; priority: number }[] = [
  { labels: ['lucro líquido', 'lucro liquido', 'net income'], priority: 1 },
  { labels: ['resultado líquido', 'resultado liquido', 'net result'], priority: 2 },
];

// ==================== Row finders ====================

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

export function findRevenueRow(data: SpreadsheetData): number | null {
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
      for (const pattern of REVENUE_PATTERNS) {
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

export function findDeductionsRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, DEDUCTIONS_PATTERNS);
}

export function findNetRevenueRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, NET_REVENUE_PATTERNS);
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

export function findDARow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, DA_PATTERNS);
}

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

export function findFinancialResultRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, FINANCIAL_RESULT_PATTERNS);
}

export function findEBTRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, EBT_PATTERNS);
}

export function findTaxRow(data: SpreadsheetData): number | null {
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
      for (const pattern of TAX_PATTERNS) {
        if (pattern.labels.some(label => cellText.includes(label))) {
          if (pattern.excludes && pattern.excludes.some(ex => cellText.includes(ex))) {
            continue;
          }
          candidates.push({ row: r, priority: pattern.priority });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].row;
}

export function findNetIncomeRow(data: SpreadsheetData): number | null {
  return findRowByPatterns(data, NET_INCOME_PATTERNS);
}

// ==================== Historical value helper ====================

function findLastHistoricalValue(data: SpreadsheetData, row: number, originalColCount: number): {
  value: number;
  col: number;
} | null {
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

// ==================== Getters for projected values ====================

export function getProjectedNetRevenue(data: SpreadsheetData, originalColCount: number): number | null {
  const row = findNetRevenueRow(data);
  if (row === null) return null;
  const val = data.values[row]?.[originalColCount];
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getProjectedGrossProfit(data: SpreadsheetData, originalColCount: number): number | null {
  const row = findGrossProfitRow(data);
  if (row === null) return null;
  const val = data.values[row]?.[originalColCount];
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getProjectedEBITDA(data: SpreadsheetData, originalColCount: number): number | null {
  const row = findEBITDARow(data);
  if (row === null) return null;
  const val = data.values[row]?.[originalColCount];
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getProjectedEBIT(data: SpreadsheetData, originalColCount: number): number | null {
  const row = findEBITRow(data);
  if (row === null) return null;
  const val = data.values[row]?.[originalColCount];
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getProjectedEBT(data: SpreadsheetData, originalColCount: number): number | null {
  const row = findEBTRow(data);
  if (row === null) return null;
  const val = data.values[row]?.[originalColCount];
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

// ==================== Projection functions with formulas ====================

/**
 * Apply revenue growth rate. Formula: =PREV_COL*(1+rate)
 * If premissasExcelRow is provided, references Premissas!C{row} instead of hardcoded rate.
 */
export function applyRevenueProjection(
  data: SpreadsheetData,
  growthRate: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const revenueRow = findRevenueRow(data);
  if (revenueRow === null) return data;

  const lastHistorical = findLastHistoricalValue(data, revenueRow, originalColCount);
  if (!lastHistorical) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = growthRate / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;
  let previousValue = lastHistorical.value;

  for (let c = originalColCount; c < data.colCount; c++) {
    const projectedValue = previousValue * (1 + rate);
    newValues[revenueRow][c] = Math.round(projectedValue * 100) / 100;

    const prevCol = c - 1;
    newFormulas[revenueRow][c] = `=${cellRef(revenueRow, prevCol)}*(1+${rateRef})`;

    previousValue = projectedValue;
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply deductions as % of gross revenue.
 * Deductions formula: =-REVENUE*rate
 * Net Revenue formula: =REVENUE+DEDUCTIONS
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applyDeductionsProjection(
  data: SpreadsheetData,
  deductionsPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const revenueRow = findRevenueRow(data);
  const deductionsRow = findDeductionsRow(data);
  const netRevenueRow = findNetRevenueRow(data);

  if (revenueRow === null || deductionsRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = deductionsPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const revenueVal = newValues[revenueRow][c];
    if (revenueVal == null) continue;
    const revenue = typeof revenueVal === 'number' ? revenueVal : parseFloat(String(revenueVal));
    if (isNaN(revenue)) continue;

    const deduction = Math.round(revenue * rate * 100) / 100;
    newValues[deductionsRow][c] = -deduction;
    newFormulas[deductionsRow][c] = `=-${cellRef(revenueRow, c)}*${rateRef}`;

    if (netRevenueRow !== null) {
      newValues[netRevenueRow][c] = Math.round((revenue - deduction) * 100) / 100;
      newFormulas[netRevenueRow][c] = `=${cellRef(revenueRow, c)}+${cellRef(deductionsRow, c)}`;
    }
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply COGS as % of Net Revenue.
 * COGS formula: =-NET_REV*rate
 * Gross Profit formula: =NET_REV+COGS
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applyCOGSProjection(
  data: SpreadsheetData,
  cogsPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const netRevenueRow = findNetRevenueRow(data);
  const cogsRow = findCOGSRow(data);
  const grossProfitRow = findGrossProfitRow(data);

  if (netRevenueRow === null || cogsRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = cogsPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const netRevVal = newValues[netRevenueRow][c];
    if (netRevVal == null) continue;
    const netRevenue = typeof netRevVal === 'number' ? netRevVal : parseFloat(String(netRevVal));
    if (isNaN(netRevenue)) continue;

    const cogs = Math.round(netRevenue * rate * 100) / 100;
    newValues[cogsRow][c] = -cogs;
    newFormulas[cogsRow][c] = `=-${cellRef(netRevenueRow, c)}*${rateRef}`;

    if (grossProfitRow !== null) {
      newValues[grossProfitRow][c] = Math.round((netRevenue - cogs) * 100) / 100;
      newFormulas[grossProfitRow][c] = `=${cellRef(netRevenueRow, c)}+${cellRef(cogsRow, c)}`;
    }
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply SGA as % of Gross Profit.
 * SGA formula: =-GROSS_PROFIT*rate
 * EBITDA formula: =GROSS_PROFIT+SGA
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applySGAProjection(
  data: SpreadsheetData,
  sgaPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const grossProfitRow = findGrossProfitRow(data);
  const sgaRow = findSGARow(data);
  const ebitdaRow = findEBITDARow(data);

  if (grossProfitRow === null || sgaRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = sgaPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const gpVal = newValues[grossProfitRow][c];
    if (gpVal == null) continue;
    const gp = typeof gpVal === 'number' ? gpVal : parseFloat(String(gpVal));
    if (isNaN(gp)) continue;

    const sga = Math.round(gp * rate * 100) / 100;
    newValues[sgaRow][c] = -sga;
    newFormulas[sgaRow][c] = `=-${cellRef(grossProfitRow, c)}*${rateRef}`;

    if (ebitdaRow !== null) {
      newValues[ebitdaRow][c] = Math.round((gp - sga) * 100) / 100;
      newFormulas[ebitdaRow][c] = `=${cellRef(grossProfitRow, c)}+${cellRef(sgaRow, c)}`;
    }
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply D&A as % of Net Revenue.
 * D&A formula: =-NET_REV*rate
 * EBIT formula: =EBITDA+DA
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applyDAProjection(
  data: SpreadsheetData,
  daPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const netRevenueRow = findNetRevenueRow(data);
  const daRow = findDARow(data);
  const ebitdaRow = findEBITDARow(data);
  const ebitRow = findEBITRow(data);

  if (netRevenueRow === null || daRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = daPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const netRevVal = newValues[netRevenueRow][c];
    if (netRevVal == null) continue;
    const netRevenue = typeof netRevVal === 'number' ? netRevVal : parseFloat(String(netRevVal));
    if (isNaN(netRevenue)) continue;

    const da = Math.round(netRevenue * rate * 100) / 100;
    newValues[daRow][c] = -da;
    newFormulas[daRow][c] = `=-${cellRef(netRevenueRow, c)}*${rateRef}`;

    if (ebitRow !== null && ebitdaRow !== null) {
      const ebitdaVal = newValues[ebitdaRow][c];
      if (ebitdaVal != null) {
        const ebitda = typeof ebitdaVal === 'number' ? ebitdaVal : parseFloat(String(ebitdaVal));
        if (!isNaN(ebitda)) {
          newValues[ebitRow][c] = Math.round((ebitda - da) * 100) / 100;
          newFormulas[ebitRow][c] = `=${cellRef(ebitdaRow, c)}+${cellRef(daRow, c)}`;
        }
      }
    }
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply Financial Result as % of Net Revenue.
 * Fin Result formula: =-NET_REV*rate
 * EBT formula: =EBIT+FIN_RESULT
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applyFinancialResultProjection(
  data: SpreadsheetData,
  financialResultPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const netRevenueRow = findNetRevenueRow(data);
  const financialResultRow = findFinancialResultRow(data);
  const ebitRow = findEBITRow(data);
  const ebtRow = findEBTRow(data);

  if (netRevenueRow === null || financialResultRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = financialResultPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const netRevVal = newValues[netRevenueRow][c];
    if (netRevVal == null) continue;
    const netRevenue = typeof netRevVal === 'number' ? netRevVal : parseFloat(String(netRevVal));
    if (isNaN(netRevenue)) continue;

    const financialResult = Math.round(netRevenue * rate * 100) / 100;
    newValues[financialResultRow][c] = -financialResult;
    newFormulas[financialResultRow][c] = `=-${cellRef(netRevenueRow, c)}*${rateRef}`;

    if (ebtRow !== null && ebitRow !== null) {
      const ebitVal = newValues[ebitRow][c];
      if (ebitVal != null) {
        const ebitNum = typeof ebitVal === 'number' ? ebitVal : parseFloat(String(ebitVal));
        if (!isNaN(ebitNum)) {
          newValues[ebtRow][c] = Math.round((ebitNum - financialResult) * 100) / 100;
          newFormulas[ebtRow][c] = `=${cellRef(ebitRow, c)}+${cellRef(financialResultRow, c)}`;
        }
      }
    }
  }

  return buildResult(data, newValues, newFormulas);
}

/**
 * Apply Tax as % of EBT.
 * Tax formula: =IF(EBT<0,0,-EBT*rate)
 * Net Income formula: =EBT+TAX
 * If premissasExcelRow is provided, references Premissas!C{row}/100 instead of hardcoded rate.
 */
export function applyTaxProjection(
  data: SpreadsheetData,
  taxPercent: number,
  originalColCount: number,
  premissasExcelRow?: number
): SpreadsheetData {
  const ebtRow = findEBTRow(data);
  const taxRow = findTaxRow(data);
  const netIncomeRow = findNetIncomeRow(data);

  if (ebtRow === null || taxRow === null) return data;

  const { newValues, newFormulas } = cloneDataArrays(data);
  const rate = taxPercent / 100;
  const rateRef = premissasExcelRow ? `Premissas!C${premissasExcelRow}/100` : `${rate}`;

  for (let c = originalColCount; c < data.colCount; c++) {
    const ebtVal = newValues[ebtRow][c];
    if (ebtVal == null) continue;
    const ebt = typeof ebtVal === 'number' ? ebtVal : parseFloat(String(ebtVal));
    if (isNaN(ebt)) continue;

    const tax = ebt < 0 ? 0 : Math.round(ebt * rate * 100) / 100;
    newValues[taxRow][c] = -tax;
    newFormulas[taxRow][c] = `=IF(${cellRef(ebtRow, c)}<0,0,-${cellRef(ebtRow, c)}*${rateRef})`;

    if (netIncomeRow !== null) {
      newValues[netIncomeRow][c] = Math.round((ebt - tax) * 100) / 100;
      newFormulas[netIncomeRow][c] = `=${cellRef(ebtRow, c)}+${cellRef(taxRow, c)}`;
    }
  }

  return buildResult(data, newValues, newFormulas);
}
