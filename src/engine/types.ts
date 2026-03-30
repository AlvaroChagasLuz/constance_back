/**
 * Constance Valuation Engine — Core Types
 *
 * This file defines the complete type system for a DCF valuation model.
 * Every valuation parameter, assumption, and computed result lives here.
 * The ValuationModel is the single source of truth for the entire application.
 */

// ============================================================================
// Income Statement Projection Assumptions
// ============================================================================

export interface IncomeStatementAssumptions {
  /** Number of projection years (1–30) */
  projectionYears: number;

  /** Revenue growth rate in % per year */
  revenueGrowthRate: number;

  /** Deductions as % of Gross Revenue */
  deductionsPercent: number;

  /** COGS as % of Net Revenue */
  cogsPercent: number;

  /** SG&A as % of Gross Profit */
  sgaPercent: number;

  /** D&A as % of Net Revenue */
  daPercent: number;

  /** Financial result as % of Net Revenue (applied as expense) */
  financialResultPercent: number;

  /** Tax rate as % of EBT */
  taxRate: number;
}

export const DEFAULT_INCOME_STATEMENT_ASSUMPTIONS: IncomeStatementAssumptions = {
  projectionYears: 5,
  revenueGrowthRate: 10,
  deductionsPercent: 10,
  cogsPercent: 30,
  sgaPercent: 25,
  daPercent: 3,
  financialResultPercent: 2,
  taxRate: 34,
};

// ============================================================================
// Free Cash Flow Assumptions
// ============================================================================

export type CapexMethod = 'percent_of_revenue' | 'equals_da' | 'manual';
export type WorkingCapitalMethod = 'percent_of_revenue' | 'days' | 'manual';

export interface FCFAssumptions {
  /** How to project CapEx */
  capexMethod: CapexMethod;

  /** CapEx as % of Net Revenue (used when method = 'percent_of_revenue') */
  capexPercentOfRevenue: number;

  /** Manual CapEx values per projected year (used when method = 'manual') */
  capexManualValues: Record<string, number>;

  /** How to project Working Capital changes */
  workingCapitalMethod: WorkingCapitalMethod;

  /** Working Capital as % of Net Revenue (used when method = 'percent_of_revenue') */
  wcPercentOfRevenue: number;

  /**
   * Working Capital via days (used when method = 'days')
   * DSO = Days Sales Outstanding (Accounts Receivable)
   * DIO = Days Inventory Outstanding
   * DPO = Days Payable Outstanding
   * Net WC Days = DSO + DIO - DPO
   */
  wcDSO: number;
  wcDIO: number;
  wcDPO: number;

  /** Manual ΔWC values per projected year (used when method = 'manual') */
  wcManualValues: Record<string, number>;
}

export const DEFAULT_FCF_ASSUMPTIONS: FCFAssumptions = {
  capexMethod: 'equals_da',
  capexPercentOfRevenue: 5,
  capexManualValues: {},

  workingCapitalMethod: 'percent_of_revenue',
  wcPercentOfRevenue: 10,
  wcDSO: 45,
  wcDIO: 30,
  wcDPO: 40,
  wcManualValues: {},
};

// ============================================================================
// WACC (Weighted Average Cost of Capital) Parameters
// ============================================================================

export interface WACCParameters {
  // --- Cost of Equity (Ke) via CAPM ---

  /** Risk-free rate (%) — typically US 10Y Treasury */
  riskFreeRate: number;

  /** Levered Beta of the company or sector */
  leveredBeta: number;

  /** Equity Risk Premium (%) — market return minus risk-free */
  equityRiskPremium: number;

  /** Size premium (%) — for smaller companies. 0 if not applicable */
  sizePremium: number;

  /** Country Risk Premium (%) — critical for emerging markets like Brazil */
  countryRiskPremium: number;

  /** Additional company-specific risk premium (%) — optional */
  companySpecificRisk: number;

  // --- Cost of Debt (Kd) ---

  /** Pre-tax cost of debt (%) */
  costOfDebt: number;

  /** Marginal tax rate for tax shield (%) — usually same as projection tax rate */
  taxRateForDebt: number;

  // --- Capital Structure ---

  /** Market value of equity (or book if market unavailable) */
  equityValue: number;

  /** Market value of debt (or book value) */
  debtValue: number;
}

export const DEFAULT_WACC_PARAMETERS: WACCParameters = {
  // CAPM defaults — reasonable for Brazil (BRL-denominated model)
  riskFreeRate: 4.5,       // US 10Y Treasury (approx)
  leveredBeta: 1.0,        // market average
  equityRiskPremium: 5.5,  // Damodaran mature market ERP
  sizePremium: 0,
  countryRiskPremium: 3.0, // Damodaran Brazil CRP (approx)
  companySpecificRisk: 0,

  costOfDebt: 12.0,        // typical Brazilian CDI-linked debt
  taxRateForDebt: 34,      // IRPJ + CSLL

  equityValue: 100,
  debtValue: 50,
};

// ============================================================================
// Terminal Value Parameters
// ============================================================================

export type TerminalValueMethod = 'gordon_growth' | 'exit_multiple' | 'both';

export interface TerminalValueParameters {
  /** Which TV method(s) to use */
  method: TerminalValueMethod;

  /** Perpetuity growth rate (%) for Gordon Growth Model */
  perpetuityGrowthRate: number;

  /** Exit EV/EBITDA multiple for Exit Multiple method */
  exitMultiple: number;
}

export const DEFAULT_TERMINAL_VALUE_PARAMETERS: TerminalValueParameters = {
  method: 'both',
  perpetuityGrowthRate: 3.0,  // typical real growth + inflation
  exitMultiple: 8.0,          // median EV/EBITDA for mid-market
};

// ============================================================================
// Equity Bridge — from Enterprise Value to Equity Value
// ============================================================================

export interface EquityBridgeParameters {
  /** Total debt at valuation date */
  totalDebt: number;

  /** Cash and cash equivalents at valuation date */
  cashAndEquivalents: number;

  /** Non-operating assets (investments, real estate not in operations, etc.) */
  nonOperatingAssets: number;

  /** Minority interest / non-controlling interests */
  minorityInterest: number;

  /** Total shares outstanding (for per-share calculation) */
  sharesOutstanding: number;
}

export const DEFAULT_EQUITY_BRIDGE: EquityBridgeParameters = {
  totalDebt: 0,
  cashAndEquivalents: 0,
  nonOperatingAssets: 0,
  minorityInterest: 0,
  sharesOutstanding: 1,
};

// ============================================================================
// Computed Results — the output of the valuation engine
// ============================================================================

export interface ProjectedYear {
  /** The year label (e.g., "2025") */
  year: string;

  /** Column index in the spreadsheet (for formula references) */
  colIndex: number;

  // Income Statement
  grossRevenue: number;
  deductions: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  sga: number;
  ebitda: number;
  da: number;
  ebit: number;
  financialResult: number;
  ebt: number;
  tax: number;
  netIncome: number;

  // Free Cash Flow
  nopat: number;      // EBIT × (1 - tax rate)
  capex: number;
  deltaWC: number;    // change in working capital
  fcff: number;       // Free Cash Flow to Firm

  // Discounting
  discountFactor: number;  // 1 / (1 + WACC)^n
  pvFCF: number;           // PV of this year's FCF
}

export interface WACCResult {
  /** Cost of Equity via CAPM */
  costOfEquity: number;

  /** After-tax Cost of Debt */
  costOfDebtAfterTax: number;

  /** Equity weight in capital structure */
  equityWeight: number;

  /** Debt weight in capital structure */
  debtWeight: number;

  /** Final WACC */
  wacc: number;
}

export interface TerminalValueResult {
  /** TV via Gordon Growth Model (null if not selected) */
  gordonGrowth: number | null;

  /** TV via Exit Multiple (null if not selected) */
  exitMultiple: number | null;

  /** Present Value of Terminal Value (Gordon) */
  pvGordonGrowth: number | null;

  /** Present Value of Terminal Value (Exit Multiple) */
  pvExitMultiple: number | null;
}

export interface ValuationResult {
  /** Sum of PV of projected FCFs */
  pvOfFCFs: number;

  /** Terminal Value result (both methods) */
  terminalValue: TerminalValueResult;

  /** Enterprise Value = PV of FCFs + PV of Terminal Value */
  enterpriseValueGordon: number | null;
  enterpriseValueExitMultiple: number | null;

  /** Equity Value = EV - Net Debt + Non-operating assets - Minority interests */
  equityValueGordon: number | null;
  equityValueExitMultiple: number | null;

  /** Implied price per share */
  pricePerShareGordon: number | null;
  pricePerShareExitMultiple: number | null;

  /** TV as % of EV (important metric for analysts) */
  tvAsPercentOfEVGordon: number | null;
  tvAsPercentOfEVExitMultiple: number | null;
}

export interface SensitivityMatrix {
  /** Row variable name (e.g., "WACC") */
  rowLabel: string;
  /** Column variable name (e.g., "Perpetuity Growth") */
  colLabel: string;
  /** Row variable values */
  rowValues: number[];
  /** Column variable values */
  colValues: number[];
  /** Matrix of equity values: [row][col] */
  matrix: number[][];
  /** Index of the base case row */
  baseRowIndex: number;
  /** Index of the base case column */
  baseColIndex: number;
}

// ============================================================================
// The Complete Valuation Model
// ============================================================================

export type ValuationStep =
  | 'import'
  | 'confirm'
  | 'modelling'
  | 'assumptions'      // revenue
  | 'deductions'
  | 'cogs'
  | 'sga'
  | 'da'
  | 'financial_result'
  | 'tax'
  | 'capex_wc'         // Phase 2: CapEx & Working Capital (NEW)
  | 'wacc'             // Phase 3: WACC Calculator (NEW)
  | 'terminal_value'   // Phase 4: Terminal Value (NEW)
  | 'equity_bridge'    // Phase 4: Equity Bridge (NEW)
  | 'results';         // Phase 5: Final Results (NEW)

export interface ValuationModel {
  /** Current step in the wizard */
  currentStep: ValuationStep;

  /** Metadata */
  projectName: string;
  currency: string;
  valuationDate: string;  // ISO date string

  /** Last closed fiscal year detected from spreadsheet */
  lastClosedYear: number | null;

  /** Original column count before projection columns were added */
  originalColCount: number;

  // --- Input Assumptions ---
  incomeStatement: IncomeStatementAssumptions;
  fcf: FCFAssumptions;
  wacc: WACCParameters;
  terminalValue: TerminalValueParameters;
  equityBridge: EquityBridgeParameters;

  // --- Computed Results ---
  projectedYears: ProjectedYear[];
  waccResult: WACCResult | null;
  terminalValueResult: TerminalValueResult | null;
  valuationResult: ValuationResult | null;
  sensitivityWACCvsGrowth: SensitivityMatrix | null;

  // --- Tracking ---
  completedSteps: Set<ValuationStep>;
}

export const createDefaultValuationModel = (): ValuationModel => ({
  currentStep: 'import',
  projectName: 'Nova Avaliação',
  currency: 'BRL',
  valuationDate: new Date().toISOString().split('T')[0],
  lastClosedYear: null,
  originalColCount: 0,

  incomeStatement: { ...DEFAULT_INCOME_STATEMENT_ASSUMPTIONS },
  fcf: { ...DEFAULT_FCF_ASSUMPTIONS },
  wacc: { ...DEFAULT_WACC_PARAMETERS },
  terminalValue: { ...DEFAULT_TERMINAL_VALUE_PARAMETERS },
  equityBridge: { ...DEFAULT_EQUITY_BRIDGE },

  projectedYears: [],
  waccResult: null,
  terminalValueResult: null,
  valuationResult: null,
  sensitivityWACCvsGrowth: null,

  completedSteps: new Set(),
});
