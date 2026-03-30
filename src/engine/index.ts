/**
 * Constance Valuation Engine
 *
 * Pure financial calculation modules for DCF valuation.
 * No React dependencies — all functions are independently testable.
 *
 * Usage:
 *   import { calculateWACC, runDCFValuation, buildWACCvsGrowthSensitivity } from '@/engine';
 */

// Types
export type {
  IncomeStatementAssumptions,
  FCFAssumptions,
  CapexMethod,
  WorkingCapitalMethod,
  WACCParameters,
  TerminalValueParameters,
  TerminalValueMethod,
  EquityBridgeParameters,
  ProjectedYear,
  WACCResult,
  TerminalValueResult,
  ValuationResult,
  SensitivityMatrix,
  ValuationStep,
  ValuationModel,
} from './types';

// Default values
export {
  DEFAULT_INCOME_STATEMENT_ASSUMPTIONS,
  DEFAULT_FCF_ASSUMPTIONS,
  DEFAULT_WACC_PARAMETERS,
  DEFAULT_TERMINAL_VALUE_PARAMETERS,
  DEFAULT_EQUITY_BRIDGE,
  createDefaultValuationModel,
} from './types';

// WACC
export {
  calculateCostOfEquity,
  calculateCostOfDebtAfterTax,
  calculateCapitalWeights,
  calculateWACC,
  unleverBeta,
  releverBeta,
} from './wacc';

// Free Cash Flow
export {
  calculateNOPAT,
  calculateCapex,
  calculateDeltaWorkingCapital,
  calculateFCFF,
  buildFCFProjections,
} from './fcf';

// DCF Valuation
export {
  discountFactor,
  applyDiscounting,
  gordonGrowthTerminalValue,
  exitMultipleTerminalValue,
  calculateTerminalValue,
  calculateEnterpriseValue,
  calculateEquityValue,
  calculatePricePerShare,
  runDCFValuation,
} from './dcf';

// Sensitivity Analysis
export {
  buildWACCvsGrowthSensitivity,
  buildWACCvsExitMultipleSensitivity,
} from './sensitivity';

// Formatting
export {
  formatCurrency,
  formatCompact,
  formatPercent,
  formatMultiple,
  formatNumber,
} from './format';
