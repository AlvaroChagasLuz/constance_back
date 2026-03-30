// ==================== CapEx & Working Capital ====================

export type CapexMethod = 'equals_da' | 'percent_of_revenue';
export type WorkingCapitalMethod = 'percent_of_revenue' | 'days';

export interface FCFAssumptions {
  capexMethod: CapexMethod;
  capexPercentOfRevenue: number;
  workingCapitalMethod: WorkingCapitalMethod;
  wcPercentOfRevenue: number;
  wcDSO: number;
  wcDIO: number;
  wcDPO: number;
}

export const DEFAULT_FCF_ASSUMPTIONS: FCFAssumptions = {
  capexMethod: 'equals_da',
  capexPercentOfRevenue: 5,
  workingCapitalMethod: 'percent_of_revenue',
  wcPercentOfRevenue: 10,
  wcDSO: 45,
  wcDIO: 30,
  wcDPO: 40,
};

// ==================== WACC ====================

export interface WACCParameters {
  riskFreeRate: number;
  leveredBeta: number;
  equityRiskPremium: number;
  sizePremium: number;
  countryRiskPremium: number;
  companySpecificRisk: number;
  costOfDebt: number;
  taxRateForDebt: number;
  equityValue: number;
  debtValue: number;
}

export const DEFAULT_WACC_PARAMETERS: WACCParameters = {
  riskFreeRate: 4.5,
  leveredBeta: 1.0,
  equityRiskPremium: 6.0,
  sizePremium: 2.0,
  countryRiskPremium: 3.0,
  companySpecificRisk: 1.0,
  costOfDebt: 12.0,
  taxRateForDebt: 34.0,
  equityValue: 100,
  debtValue: 50,
};

export interface WACCResult {
  costOfEquity: number;
  costOfDebtAfterTax: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number;
}

// ==================== Terminal Value ====================

export type TerminalValueMethod = 'gordon_growth' | 'exit_multiple' | 'both';

export interface TerminalValueParameters {
  method: TerminalValueMethod;
  perpetuityGrowthRate: number;
  exitMultiple: number;
}

export const DEFAULT_TERMINAL_VALUE_PARAMETERS: TerminalValueParameters = {
  method: 'gordon_growth',
  perpetuityGrowthRate: 3.0,
  exitMultiple: 8.0,
};

// ==================== Equity Bridge ====================

export interface EquityBridgeParameters {
  totalDebt: number;
  cashAndEquivalents: number;
  nonOperatingAssets: number;
  minorityInterest: number;
  sharesOutstanding: number;
}

export const DEFAULT_EQUITY_BRIDGE: EquityBridgeParameters = {
  totalDebt: 0,
  cashAndEquivalents: 0,
  nonOperatingAssets: 0,
  minorityInterest: 0,
  sharesOutstanding: 1,
};

// ==================== Projected Year & Valuation ====================

export interface ProjectedYear {
  year: number | string;
  ebitda: number;
  da: number;
  ebit: number;
  nopat: number;
  capex: number;
  deltaWC: number;
  fcff: number;
  discountFactor: number;
  pvFCF: number;
}

export interface TerminalValueResult {
  gordonGrowth: number | null;
  exitMultiple: number | null;
}

export interface ValuationResult {
  pvOfFCFs: number;
  terminalValue: TerminalValueResult;
  pvTerminalValueGordon: number | null;
  pvTerminalValueExitMultiple: number | null;
  enterpriseValueGordon: number | null;
  enterpriseValueExitMultiple: number | null;
  equityValueGordon: number | null;
  equityValueExitMultiple: number | null;
  pricePerShareGordon: number | null;
  pricePerShareExitMultiple: number | null;
  tvAsPercentOfEVGordon: number | null;
  tvAsPercentOfEVExitMultiple: number | null;
}

// ==================== Sensitivity ====================

export interface SensitivityMatrix {
  rowLabel: string;
  colLabel: string;
  rowValues: number[];
  colValues: number[];
  matrix: number[][];
  baseRowIndex: number;
  baseColIndex: number;
}
