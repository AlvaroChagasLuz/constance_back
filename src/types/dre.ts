export interface DRERow {
  id: string;
  account: string;
  category: DRECategory;
  values: Record<string, number>;
  isEditing?: boolean;
  isCollapsed?: boolean;
  level: number;
}

export type DRECategory =
  | 'receita_bruta'
  | 'deducoes'
  | 'receita_liquida'
  | 'cogs'
  | 'lucro_bruto'
  | 'despesas_operacionais'
  | 'ebitda'
  | 'depreciacao'
  | 'ebit'
  | 'imposto'
  | 'lucro_liquido'
  | 'outras';

export const CATEGORY_LABELS: Record<DRECategory, string> = {
  receita_bruta: 'Receita Bruta',
  deducoes: 'Deduções',
  receita_liquida: 'Receita Líquida',
  cogs: 'Custo dos Produtos/Serviços (COGS)',
  lucro_bruto: 'Lucro Bruto',
  despesas_operacionais: 'Despesas Operacionais (SG&A)',
  ebitda: 'EBITDA',
  depreciacao: 'Depreciação/Amortização',
  ebit: 'EBIT',
  imposto: 'Imposto',
  lucro_liquido: 'Lucro Líquido',
  outras: 'Outras Linhas',
};

export const CATEGORY_ORDER: DRECategory[] = [
  'receita_bruta',
  'deducoes',
  'receita_liquida',
  'cogs',
  'lucro_bruto',
  'despesas_operacionais',
  'ebitda',
  'depreciacao',
  'ebit',
  'imposto',
  'lucro_liquido',
  'outras',
];

export interface ProjectionPremises {
  // General
  projectionYears: number;
  baseYear: string;
  currency: string;

  // Revenue
  revenueMethod: 'growth_rate' | 'cagr' | 'manual';
  revenueGrowthRate: number;
  revenueManualRates: Record<string, number>;

  // Costs
  cogsMethod: 'revenue_percent' | 'gross_margin';
  cogsPercent: number;
  grossMarginPercent: number;

  // Operating Expenses
  sgaMethod: 'revenue_percent' | 'fixed';
  sgaPercent: number;
  sgaGrowthRate: number;

  // Depreciation & CAPEX
  depreciationPercent: number;
  capexPercent: number;
  capexEqualsDepreciation: boolean;

  // Taxes
  taxRate: number;
}

export const DEFAULT_PREMISES: ProjectionPremises = {
  projectionYears: 5,
  baseYear: '',
  currency: 'BRL',

  revenueMethod: 'growth_rate',
  revenueGrowthRate: 10,
  revenueManualRates: {},

  cogsMethod: 'revenue_percent',
  cogsPercent: 30,
  grossMarginPercent: 70,

  sgaMethod: 'revenue_percent',
  sgaPercent: 15,
  sgaGrowthRate: 5,

  depreciationPercent: 3,
  capexPercent: 3,
  capexEqualsDepreciation: true,

  taxRate: 34,
};

export interface DREData {
  rows: DRERow[];
  periods: string[];
}
