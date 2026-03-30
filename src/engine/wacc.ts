/**
 * Constance Valuation Engine — WACC Calculator
 *
 * Pure functions for computing the Weighted Average Cost of Capital.
 * No React dependencies — testable independently.
 *
 * Formula:
 *   Ke = Rf + β × ERP + Size Premium + Country Risk Premium + Company-Specific Risk
 *   Kd_after_tax = Kd × (1 - t)
 *   WACC = Ke × (E / (D+E)) + Kd_after_tax × (D / (D+E))
 */

import type { WACCParameters, WACCResult } from './types';

/**
 * Calculate Cost of Equity using the Capital Asset Pricing Model (CAPM).
 *
 * Ke = Rf + β × ERP + Size Premium + CRP + Company-Specific Risk
 *
 * For Brazilian valuations (BRL-denominated), this typically uses:
 * - Rf: US 10Y Treasury yield
 * - β: Levered beta for the sector
 * - ERP: Damodaran's mature market Equity Risk Premium
 * - CRP: Damodaran's Country Risk Premium for Brazil
 * - Size Premium: Ibbotson/Duff & Phelps size premium (optional)
 */
export function calculateCostOfEquity(params: WACCParameters): number {
  const {
    riskFreeRate,
    leveredBeta,
    equityRiskPremium,
    sizePremium,
    countryRiskPremium,
    companySpecificRisk,
  } = params;

  return (
    riskFreeRate +
    leveredBeta * equityRiskPremium +
    sizePremium +
    countryRiskPremium +
    companySpecificRisk
  );
}

/**
 * Calculate the after-tax Cost of Debt.
 *
 * Kd_after_tax = Kd × (1 - t)
 *
 * The tax shield reduces the effective cost of debt because interest
 * payments are tax-deductible.
 */
export function calculateCostOfDebtAfterTax(params: WACCParameters): number {
  const { costOfDebt, taxRateForDebt } = params;
  return costOfDebt * (1 - taxRateForDebt / 100);
}

/**
 * Calculate capital structure weights.
 *
 * We = E / (D + E)
 * Wd = D / (D + E)
 *
 * Ideally uses market values. Falls back to book values
 * if market data is unavailable.
 */
export function calculateCapitalWeights(params: WACCParameters): {
  equityWeight: number;
  debtWeight: number;
} {
  const { equityValue, debtValue } = params;
  const totalCapital = equityValue + debtValue;

  if (totalCapital <= 0) {
    return { equityWeight: 1, debtWeight: 0 };
  }

  return {
    equityWeight: equityValue / totalCapital,
    debtWeight: debtValue / totalCapital,
  };
}

/**
 * Calculate the full WACC.
 *
 * WACC = Ke × We + Kd × (1 - t) × Wd
 *
 * Returns all intermediate values so the UI can display the breakdown.
 */
export function calculateWACC(params: WACCParameters): WACCResult {
  const costOfEquity = calculateCostOfEquity(params);
  const costOfDebtAfterTax = calculateCostOfDebtAfterTax(params);
  const { equityWeight, debtWeight } = calculateCapitalWeights(params);

  const wacc =
    costOfEquity * equityWeight +
    costOfDebtAfterTax * debtWeight;

  return {
    costOfEquity,
    costOfDebtAfterTax,
    equityWeight,
    debtWeight,
    wacc,
  };
}

/**
 * Unlever a beta using the Hamada equation.
 *
 * β_unlevered = β_levered / (1 + (1 - t) × D/E)
 *
 * Useful when the analyst wants to relever a sector beta
 * to the target company's capital structure.
 */
export function unleverBeta(
  leveredBeta: number,
  taxRate: number,
  debtToEquity: number
): number {
  return leveredBeta / (1 + (1 - taxRate / 100) * debtToEquity);
}

/**
 * Relever a beta using the Hamada equation.
 *
 * β_levered = β_unlevered × (1 + (1 - t) × D/E)
 */
export function releverBeta(
  unleveredBeta: number,
  taxRate: number,
  debtToEquity: number
): number {
  return unleveredBeta * (1 + (1 - taxRate / 100) * debtToEquity);
}
