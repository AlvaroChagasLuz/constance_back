import type { SpreadsheetData, CellFormat } from '@/types/spreadsheet';

export interface AssumptionEntry {
  category: string;
  label: string;
  value: number;
  unit: string;
}

const HEADER_FORMAT: CellFormat = {
  bold: true,
  fontSize: 11,
  bgColor: '#1e293b',
  textColor: '#ffffff',
  horizontalAlignment: 'center',
  verticalAlignment: 'middle',
  borderBottom: { style: 'medium', color: '#334155' },
};

const CATEGORY_FORMAT: CellFormat = {
  bold: true,
  fontSize: 10,
  bgColor: '#f1f5f9',
  textColor: '#0f172a',
  verticalAlignment: 'middle',
  borderBottom: { style: 'thin', color: '#cbd5e1' },
};

const LABEL_FORMAT: CellFormat = {
  fontSize: 10,
  textColor: '#334155',
  verticalAlignment: 'middle',
  horizontalAlignment: 'left',
  borderBottom: { style: 'thin', color: '#e2e8f0' },
};

const VALUE_FORMAT: CellFormat = {
  fontSize: 10,
  bold: true,
  textColor: '#0f172a',
  verticalAlignment: 'middle',
  horizontalAlignment: 'center',
  borderBottom: { style: 'thin', color: '#e2e8f0' },
};

const UNIT_FORMAT: CellFormat = {
  fontSize: 9,
  textColor: '#64748b',
  verticalAlignment: 'middle',
  horizontalAlignment: 'center',
  borderBottom: { style: 'thin', color: '#e2e8f0' },
};

const LINK_FORMAT: CellFormat = {
  fontSize: 9,
  italic: true,
  textColor: '#6366f1',
  verticalAlignment: 'middle',
  horizontalAlignment: 'left',
  borderBottom: { style: 'thin', color: '#e2e8f0' },
};

/**
 * Compute a map of { label → 1-indexed Excel row } for each assumption entry's value cell (column C).
 * This is used to generate cross-sheet formula references like =Premissas!C7
 */
export function buildAssumptionsRowMap(entries: AssumptionEntry[]): Map<string, number> {
  // Layout mirrors buildAssumptionsSheet:
  // Row 1 (index 0): Title
  // Row 2 (index 1): Spacer
  // Row 3 (index 2): Headers
  // Row 4+ (index 3+): grouped entries
  const map = new Map<string, number>();
  const grouped = new Map<string, AssumptionEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.category) || [];
    group.push(entry);
    grouped.set(entry.category, group);
  }

  let currentRow = 3; // 0-indexed; row 4 in Excel (1-indexed)
  for (const [, items] of grouped) {
    currentRow++; // category header row
    for (const item of items) {
      // value is in column C (index 2), Excel row = currentRow + 1 (1-indexed)
      map.set(item.label, currentRow + 1);
      currentRow++;
    }
    currentRow++; // empty spacer after group
  }

  return map;
}

/**
 * Build a SpreadsheetData representing the consolidated assumptions sheet.
 * Each assumption is shown with its category, label, value, unit, and a "link" reference
 * indicating where the value is used in the model.
 */
export function buildAssumptionsSheet(entries: AssumptionEntry[]): SpreadsheetData {
  // Columns: A = Categoria, B = Premissa, C = Valor, D = Unidade, E = Referência
  const colCount = 5;
  const columnWidths = [160, 240, 100, 80, 200];

  // Row 0: Title
  // Row 1: Column headers
  // Row 2+: entries grouped by category
  const values: (string | number | null)[][] = [];
  const formats: (CellFormat | null)[][] = [];

  // Row 0 — Title
  const titleFormat: CellFormat = {
    bold: true,
    fontSize: 13,
    textColor: '#0f172a',
    bgColor: '#f8fafc',
    verticalAlignment: 'middle',
    horizontalAlignment: 'left',
    borderBottom: { style: 'medium', color: '#e2e8f0' },
  };
  values.push(['Premissas do Modelo', null, null, null, null]);
  formats.push([{ ...titleFormat }, { ...titleFormat, bgColor: '#f8fafc' }, { ...titleFormat, bgColor: '#f8fafc' }, { ...titleFormat, bgColor: '#f8fafc' }, { ...titleFormat, bgColor: '#f8fafc' }]);

  // Row 1 — Empty spacer
  values.push([null, null, null, null, null]);
  formats.push([null, null, null, null, null]);

  // Row 2 — Column headers
  values.push(['Categoria', 'Premissa', 'Valor', 'Unidade', 'Referência no Modelo']);
  formats.push([
    { ...HEADER_FORMAT, horizontalAlignment: 'left' },
    { ...HEADER_FORMAT, horizontalAlignment: 'left' },
    { ...HEADER_FORMAT },
    { ...HEADER_FORMAT },
    { ...HEADER_FORMAT, horizontalAlignment: 'left' },
  ]);

  // Group entries by category
  const grouped = new Map<string, AssumptionEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.category) || [];
    group.push(entry);
    grouped.set(entry.category, group);
  }

  let currentRow = 3;
  for (const [category, items] of grouped) {
    // Category header row
    values.push([category, null, null, null, null]);
    formats.push([
      { ...CATEGORY_FORMAT },
      { ...CATEGORY_FORMAT },
      { ...CATEGORY_FORMAT },
      { ...CATEGORY_FORMAT },
      { ...CATEGORY_FORMAT },
    ]);
    currentRow++;

    for (const item of items) {
      // Determine reference text based on the assumption
      const refText = getReference(item);

      values.push([null, item.label, item.value, item.unit, refText]);
      formats.push([
        { ...LABEL_FORMAT },
        { ...LABEL_FORMAT },
        { ...VALUE_FORMAT },
        { ...UNIT_FORMAT },
        { ...LINK_FORMAT },
      ]);
      currentRow++;
    }

    // Empty row after category group
    values.push([null, null, null, null, null]);
    formats.push([null, null, null, null, null]);
    currentRow++;
  }

  // Pad to a minimum of 20 rows for visual consistency
  while (values.length < 20) {
    values.push([null, null, null, null, null]);
    formats.push([null, null, null, null, null]);
  }

  const rowCount = values.length;
  const rowHeights = new Array(rowCount).fill(28);
  rowHeights[0] = 36; // Title row taller

  return {
    values,
    formats,
    columnWidths,
    rowHeights,
    rowCount,
    colCount,
  };
}

/**
 * Generate the reference/link description for a given assumption.
 */
function getReference(entry: AssumptionEntry): string {
  const labelLower = entry.label.toLowerCase();

  if (labelLower.includes('crescimento') && labelLower.includes('receita')) {
    return '→ Linha Receita (colunas projetadas)';
  }

  return '→ Modelo de projeção';
}
