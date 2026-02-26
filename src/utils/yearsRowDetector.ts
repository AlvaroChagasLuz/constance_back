import type { SpreadsheetData, YearsRowData, YearsRowColumn, YearsRowDetectionResult, ColumnType } from '@/types/spreadsheet';

/**
 * Find the last (max) year in the spreadsheet data by scanning header rows.
 */
export function detectLastYearFromData(data: SpreadsheetData): number | null {
  let maxYear: number | null = null;
  for (let r = 0; r < Math.min(data.values.length, 10); r++) {
    const row = data.values[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val == null) continue;
      const str = String(val).trim();
      const num = parseInt(str, 10);
      if (num >= 1990 && num <= 2100 && String(num) === str) {
        if (maxYear === null || num > maxYear) maxYear = num;
      }
    }
  }
  return maxYear;
}

/**
 * Detect the Years Row in the spreadsheet data.
 * The Years Row is the single row containing the time axis (e.g., 2020, 2021, 2022...).
 */
export function detectYearsRow(
  data: SpreadsheetData,
  lastClosedYear: number
): YearsRowDetectionResult {
  let bestRow: { rowIndex: number; years: { year: number; colIndex: number }[] } | null = null;
  let bestScore = 0;

  for (let r = 0; r < Math.min(data.values.length, 10); r++) {
    const row = data.values[r];
    if (!row) continue;

    const yearCells: { year: number; colIndex: number }[] = [];
    let nonEmptyCount = 0;
    let hasCurrencyOrPercent = false;

    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val == null || String(val).trim() === '') continue;
      nonEmptyCount++;

      const str = String(val).trim();

      // Check for currency/percent symbols
      if (/[R$€%]/.test(str)) {
        hasCurrencyOrPercent = true;
        break;
      }

      const num = parseInt(str, 10);
      if (num >= 1990 && num <= 2100 && String(num) === str) {
        yearCells.push({ year: num, colIndex: c });
      }
    }

    if (hasCurrencyOrPercent) continue;
    if (nonEmptyCount === 0) continue;

    // Majority of non-empty cells must be years
    const yearRatio = yearCells.length / nonEmptyCount;
    if (yearRatio < 0.5) continue;
    if (yearCells.length < 2) continue;

    // Check sequentiality (allow 1 gap)
    const sortedYears = [...yearCells].sort((a, b) => a.year - b.year);
    let maxGap = 0;
    for (let i = 1; i < sortedYears.length; i++) {
      const gap = sortedYears[i].year - sortedYears[i - 1].year;
      if (gap > maxGap) maxGap = gap;
    }

    if (maxGap > 2) continue; // Allow gap of 1 (difference of 2)

    const score = yearCells.length * yearRatio;
    if (score > bestScore) {
      bestScore = score;
      bestRow = { rowIndex: r, years: sortedYears };
    }
  }

  if (!bestRow) {
    return {
      success: false,
      warning: 'Não foi possível identificar a linha de anos. Por favor, certifique-se de que os anos estão em uma única linha com valores numéricos sequenciais. / Could not detect the Years Row. Please ensure years are in a single row with sequential numeric values.',
    };
  }

  // Check for duplicates
  const yearSet = new Set<number>();
  const duplicates: number[] = [];
  for (const { year } of bestRow.years) {
    if (yearSet.has(year)) {
      duplicates.push(year);
    }
    yearSet.add(year);
  }

  if (duplicates.length > 0) {
    return {
      success: false,
      warning: `Anos duplicados encontrados: ${duplicates.join(', ')}. Corrija os dados antes de continuar.`,
    };
  }

  // Check sequentiality warnings
  const sortedYears = bestRow.years;
  for (let i = 1; i < sortedYears.length; i++) {
    const gap = sortedYears[i].year - sortedYears[i - 1].year;
    if (gap > 1) {
      return {
        success: false,
        warning: 'Os anos não estão em sequência contínua. Verifique os dados antes de continuar.',
      };
    }
  }

  // Classify columns
  const columns: YearsRowColumn[] = bestRow.years.map(({ year, colIndex }) => {
    let columnType: ColumnType;
    if (year <= lastClosedYear) {
      columnType = 'historical';
    } else if (year === lastClosedYear + 1) {
      columnType = 'current';
    } else {
      columnType = 'projection';
    }
    return { year, colIndex, columnType };
  });

  return {
    success: true,
    data: {
      rowIndex: bestRow.rowIndex,
      lastClosedYear,
      columns,
    },
  };
}

/**
 * Re-classify years row columns when lastClosedYear changes.
 */
export function reclassifyYearsRow(
  yearsRow: YearsRowData,
  lastClosedYear: number
): YearsRowData {
  const columns: YearsRowColumn[] = yearsRow.columns.map(col => {
    let columnType: ColumnType;
    if (col.year <= lastClosedYear) {
      columnType = 'historical';
    } else if (col.year === lastClosedYear + 1) {
      columnType = 'current';
    } else {
      columnType = 'projection';
    }
    return { ...col, columnType };
  });

  return {
    ...yearsRow,
    lastClosedYear,
    columns,
  };
}
