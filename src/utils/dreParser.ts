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

export function parsePastedData(text: string): DREData {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Dados insuficientes. Certifique-se de colar pelo menos uma linha de cabeçalho e uma linha de dados.');
  }
  
  const rows: DRERow[] = [];
  let periods: string[] = [];
  
  // Parse first line as header (periods)
  const headerLine = lines[0];
  const headerCells = headerLine.split(/\t/);
  
  if (headerCells.length < 2) {
    throw new Error('O cabeçalho deve ter pelo menos 2 colunas (Conta e um período).');
  }
  
  // Skip first cell (account column header), rest are periods
  periods = headerCells.slice(1).map(p => p.trim()).filter(p => p);
  
  if (periods.length === 0) {
    throw new Error('Nenhum período encontrado no cabeçalho.');
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/\t/);
    
    if (cells.length < 2) continue;
    
    const account = cells[0].trim();
    if (!account) continue;
    
    const values: Record<string, number> = {};
    let hasNumericValue = false;
    
    for (let j = 0; j < periods.length; j++) {
      const cellValue = cells[j + 1] || '';
      const num = parseNumber(cellValue);
      values[periods[j]] = num;
      if (num !== 0) hasNumericValue = true;
    }
    
    // Only add rows that have at least one numeric value or are clearly DRE lines
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
  
  return { rows, periods };
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
