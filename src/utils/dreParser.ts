import { DRERow, DRECategory, DREData } from '@/types/dre';

const CATEGORY_PATTERNS: Record<DRECategory, RegExp[]> = {
  receita_bruta: [/receita\s*(bruta|total)/i, /gross\s*revenue/i, /faturamento/i],
  deducoes: [/dedu[cç][oõ]es/i, /impostos\s*sobre\s*vendas/i, /devolu[cç][oõ]es/i, /abatimentos/i],
  receita_liquida: [/receita\s*l[ií]quida/i, /net\s*revenue/i, /net\s*sales/i],
  cogs: [/c(usto|ost)\s*(d[oe]s?\s*)?(produtos?|servi[cç]os?|mercadorias?|vendas?)/i, /cogs/i, /cpv/i, /cmv/i, /csv/i],
  lucro_bruto: [/lucro\s*bruto/i, /gross\s*profit/i, /margem\s*bruta/i, /resultado\s*bruto/i],
  despesas_operacionais: [/despesas?\s*(operacionais?|adm|gerais?|vendas?|sg&a|sga)/i, /sg&a/i, /operating\s*expenses/i],
  ebitda: [/ebitda/i, /lajida/i],
  depreciacao: [/deprecia[cç][aã]o/i, /amortiza[cç][aã]o/i, /d&a/i],
  ebit: [/ebit(?!da)/i, /lajir/i, /lucro\s*operacional/i, /operating\s*income/i, /resultado\s*operacional/i],
  imposto: [/imposto/i, /ir\s*(e\s*)?cs(ll)?/i, /tax/i, /tributos/i],
  lucro_liquido: [/lucro\s*l[ií]quido/i, /net\s*(income|profit)/i, /resultado\s*l[ií]quido/i],
  outras: [],
};

export function detectCategory(accountName: string): DRECategory {
  const normalized = accountName.trim().toLowerCase();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'outras') continue;
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return category as DRECategory;
      }
    }
  }
  
  return 'outras';
}

export function parseNumber(value: string): number {
  if (!value || value.trim() === '' || value === '-') return 0;
  
  let cleaned = value.toString().trim();
  
  // Handle parentheses as negative
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Detect format: if has both . and ,, determine which is decimal
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Find which comes last - that's the decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.000.000,00
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000,000.00
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Check if comma is decimal (1 or 2 digits after)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousand separator
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Check if dot is thousand separator (more than 2 digits after)
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  // Remove any remaining non-numeric except - and .
  cleaned = cleaned.replace(/[^\d.\-]/g, '');
  
  let num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  
  return isNegative ? -Math.abs(num) : num;
}

// Detect if a value looks like a year (4 digits between 1900-2100)
function isYear(value: string): boolean {
  const trimmed = value.trim();
  const yearMatch = trimmed.match(/^(19|20)\d{2}$/);
  return !!yearMatch;
}

// Detect year pattern in an array of values
function detectYearPattern(values: string[]): { isYearSequence: boolean; years: string[] } {
  const potentialYears = values.map(v => v.trim()).filter(v => isYear(v));
  
  if (potentialYears.length >= 2) {
    // Check if they form a reasonable sequence
    const numericYears = potentialYears.map(y => parseInt(y, 10)).sort((a, b) => a - b);
    const isSequential = numericYears.every((year, idx) => {
      if (idx === 0) return true;
      const diff = year - numericYears[idx - 1];
      return diff >= 1 && diff <= 5; // Allow gaps up to 5 years
    });
    
    if (isSequential) {
      return { isYearSequence: true, years: numericYears.map(String) };
    }
  }
  
  return { isYearSequence: false, years: [] };
}

// Find the row/column that contains years and determine orientation
function findYearsInData(lines: string[][]): {
  headerRowIndex: number;
  accountColumnIndex: number;
  periods: string[];
  dataStartRow: number;
} {
  // Check the first few rows for year patterns
  for (let rowIdx = 0; rowIdx < Math.min(lines.length, 5); rowIdx++) {
    const row = lines[rowIdx];
    if (!row || row.length < 2) continue;
    
    // Filter out empty cells and check for years
    const nonEmptyCells = row.filter(cell => cell && cell.trim() !== '');
    const yearInfo = detectYearPattern(nonEmptyCells);
    
    if (yearInfo.isYearSequence && yearInfo.years.length >= 2) {
      // Found years in this row - determine account column
      // Account column is typically the first column that's not a year and not empty
      let accountColIndex = 0;
      for (let i = 0; i < row.length; i++) {
        const cell = row[i]?.trim() || '';
        // Account column: not a year, not a number, could be empty (header label)
        if (!isYear(cell) && (cell === '' || isNaN(parseNumber(cell)) || parseNumber(cell) === 0)) {
          accountColIndex = i;
          break;
        }
      }
      
      // Extract periods: all year-like values from this row, preserving order
      const periods: string[] = [];
      for (let i = 0; i < row.length; i++) {
        if (i === accountColIndex) continue;
        const cell = row[i]?.trim() || '';
        if (isYear(cell)) {
          periods.push(cell);
        }
      }
      
      return {
        headerRowIndex: rowIdx,
        accountColumnIndex: accountColIndex,
        periods,
        dataStartRow: rowIdx + 1,
      };
    }
  }
  
  // Check if years are in the first column of data rows (transposed format)
  const firstColumnValues = lines.slice(1).map(row => row[0] || '');
  const firstColYearInfo = detectYearPattern(firstColumnValues);
  
  if (firstColYearInfo.isYearSequence) {
    return {
      headerRowIndex: -1, // Indicates transposed
      accountColumnIndex: 0,
      periods: firstColYearInfo.years,
      dataStartRow: 0,
    };
  }
  
  // Fallback: assume first row is header, first column is accounts
  // Look for any values that could be periods (years or other period labels)
  const headerCells = lines[0] || [];
  const periods: string[] = [];
  
  for (let i = 1; i < headerCells.length; i++) {
    const cell = headerCells[i]?.trim();
    if (cell) {
      periods.push(cell);
    }
  }
  
  return {
    headerRowIndex: 0,
    accountColumnIndex: 0,
    periods,
    dataStartRow: 1,
  };
}

export function parsePastedData(text: string): DREData {
  // IMPORTANT: do not trimStart() here.
  // Some Excel exports (and our ExcelJS->TSV conversion) may produce a header row
  // that starts with a tab when the first cell is blank (e.g. "\t2023\t2024...").
  // trim() would remove that leading tab and shift all columns left.
  const normalized = text.replace(/\r\n/g, '\n').trimEnd();
  const lines = normalized.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length < 2) {
    throw new Error('Dados insuficientes. Certifique-se de colar pelo menos uma linha de cabeçalho e uma linha de dados.');
  }
  
  // Split all lines into cells
  const allCells = lines.map(line => line.split(/\t/));
  
  // Detect year pattern and structure
  const structure = findYearsInData(allCells);
  
  const rows: DRERow[] = [];
  const periods = structure.periods;
  
  if (periods.length === 0) {
    throw new Error('Nenhum período encontrado. Certifique-se de ter colunas com anos (ex: 2020, 2021, 2022).');
  }
  
  // Parse data rows
  for (let i = structure.dataStartRow; i < allCells.length; i++) {
    const cells = allCells[i];
    
    if (cells.length < 2) continue;
    
    const account = cells[structure.accountColumnIndex]?.trim();
    if (!account) continue;
    
    // Skip if the account looks like a year (it's probably a header row)
    if (isYear(account)) continue;
    
    const values: Record<string, number> = {};
    let valueIndex = 0;
    
    for (let j = 0; j < cells.length; j++) {
      if (j === structure.accountColumnIndex) continue;
      
      const cellValue = cells[j] || '';
      const period = periods[valueIndex];
      
      if (period) {
        values[period] = parseNumber(cellValue);
      }
      valueIndex++;
    }
    
    const category = detectCategory(account);
    
    rows.push({
      id: `row-${i}`,
      account,
      category,
      values,
      level: 0,
    });
  }
  
  if (rows.length === 0) {
    throw new Error('Nenhuma linha de dados válida encontrada.');
  }
  
  // Sort periods if they are years
  const sortedPeriods = [...periods].sort((a, b) => {
    const yearA = parseInt(a, 10);
    const yearB = parseInt(b, 10);
    if (!isNaN(yearA) && !isNaN(yearB)) {
      return yearA - yearB;
    }
    return 0;
  });
  
  return { rows, periods: sortedPeriods };
}

export function formatCurrency(value: number, currency: string = 'BRL'): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  
  return value < 0 ? `(${formatted})` : formatted;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const SAMPLE_DRE = `Conta\t2021\t2022\t2023
Receita Bruta\t5000000\t6000000\t7500000
(-) Deduções\t-500000\t-600000\t-750000
(=) Receita Líquida\t4500000\t5400000\t6750000
(-) Custo dos Produtos Vendidos\t-1800000\t-2160000\t-2700000
(=) Lucro Bruto\t2700000\t3240000\t4050000
(-) Despesas Operacionais\t-900000\t-1080000\t-1350000
(-) Despesas com Vendas\t-450000\t-540000\t-675000
(-) Despesas Administrativas\t-360000\t-432000\t-540000
(=) EBITDA\t990000\t1188000\t1485000
(-) Depreciação e Amortização\t-180000\t-216000\t-270000
(=) EBIT\t810000\t972000\t1215000
(-) Imposto de Renda e CSLL\t-275400\t-330480\t-413100
(=) Lucro Líquido\t534600\t641520\t801900`;
