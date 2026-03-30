/**
 * Constance Valuation Engine — Free Cash Flow Calculator
 *
 * Pure functions for computing Free Cash Flow to the Firm (FCFF).
 * No React dependencies — testable independently.
 *
 * FCFF = NOPAT + D&A - CapEx - ΔWC
 * where NOPAT = EBIT × (1 - tax rate)
 */

import type { FCFAssumptions, ProjectedYear } from './types';

/**
 * Calculate NOPAT (Net Operating Profit After Tax).
 *
 * NOPAT = EBIT × (1 - effective tax rate)
 *
 * This is the operating profit available to all capital providers
 * (both debt and equity), after taxes but before financing costs.
 */
export function calculateNOPAT(ebit: number, taxRate: number): number {
  if (ebit <= 0) return ebit; // no tax benefit on operating losses (simplified)
  return ebit * (1 - taxRate / 100);
}

/**
 * Calculate CapEx for a given year based on the selected method.
 *
 * Methods:
 * - percent_of_revenue: CapEx = Net Revenue × capexPercentOfRevenue / 100
 * - equals_da: CapEx = D&A (maintenance capex assumption)
 * - manual: CapEx = user-provided value for this year
 */
export function calculateCapex(
  assumptions: FCFAssumptions,
  year: string,
  netRevenue: number,
  da: number
): number {
  switch (assumptions.capexMethod) {
    case 'percent_of_revenue':
      return Math.abs(netRevenue) * (assumptions.capexPercentOfRevenue / 100);

    case 'equals_da':
      return Math.abs(da); // D&A is stored as negative in the DRE

    case 'manual':
      return assumptions.capexManualValues[year] ?? 0;

    default:
      return Math.abs(da);
  }
}

/**
 * Calculate the change in Working Capital (ΔWC) for a given year.
 *
 * ΔWC represents the cash consumed (or released) by changes in
 * operating current assets and liabilities.
 *
 * Positive ΔWC = cash consumed (revenue growing → more WC needed)
 * Negative ΔWC = cash released (revenue shrinking or efficiency gains)
 *
 * Methods:
 * - percent_of_revenue: WC = Net Revenue × %, ΔWC = WC(t) - WC(t-1)
 * - days: WC = Net Revenue / 365 × (DSO + DIO - DPO), ΔWC = WC(t) - WC(t-1)
 * - manual: ΔWC = user-provided value for this year
 */
export function calculateDeltaWorkingCapital(
  assumptions: FCFAssumptions,
  year: string,
  currentNetRevenue: number,
  previousNetRevenue: number
): number {
  switch (assumptions.workingCapitalMethod) {
    case 'percent_of_revenue': {
      const rate = assumptions.wcPercentOfRevenue / 100;
      const currentWC = Math.abs(currentNetRevenue) * rate;
      const previousWC = Math.abs(previousNetRevenue) * rate;
      return currentWC - previousWC;
    }

    case 'days': {
      const netWCDays = assumptions.wcDSO + assumptions.wcDIO - assumptions.wcDPO;
      const currentWC = (Math.abs(currentNetRevenue) / 365) * netWCDays;
      const previousWC = (Math.abs(previousNetRevenue) / 365) * netWCDays;
      return currentWC - previousWC;
    }

    case 'manual':
      return assumptions.wcManualValues[year] ?? 0;

    default:
      return 0;
  }
}

/**
 * Calculate Free Cash Flow to the Firm (FCFF) for a single year.
 *
 * FCFF = NOPAT + D&A - CapEx - ΔWC
 *
 * Note: D&A is added back because it's a non-cash charge that was
 * already deducted from EBIT to calculate NOPAT.
 * CapEx and ΔWC are cash outlays not captured in the income statement.
 */
export function calculateFCFF(
  nopat: number,
  da: number,
  capex: number,
  deltaWC: number
): number {
  // D&A comes from the DRE as negative; we need its absolute value (add-back)
  const daAddBack = Math.abs(da);
  return nopat + daAddBack - capex - deltaWC;
}

/**
 * Build the complete FCF projections for all years.
 *
 * Takes the income statement projections (already computed by the existing
 * projection engine) and adds the FCF layer on top.
 *
 * Returns an array of ProjectedYear objects with all FCF fields populated.
 */
export function buildFCFProjections(
  incomeStatementData: Array<{
    year: string;
    colIndex: number;
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
  }>,
  fcfAssumptions: FCFAssumptions,
  taxRate: number,
  previousYearNetRevenue: number
): ProjectedYear[] {
  const years: ProjectedYear[] = [];
  let prevNetRevenue = previousYearNetRevenue;

  for (const row of incomeStatementData) {
    const nopat = calculateNOPAT(row.ebit, taxRate);
    const capex = calculateCapex(fcfAssumptions, row.year, row.netRevenue, row.da);
    const deltaWC = calculateDeltaWorkingCapital(
      fcfAssumptions,
      row.year,
      row.netRevenue,
      prevNetRevenue
    );
    const fcff = calculateFCFF(nopat, row.da, capex, deltaWC);

    years.push({
      ...row,
      nopat: round2(nopat),
      capex: round2(capex),
      deltaWC: round2(deltaWC),
      fcff: round2(fcff),
      // Discount factor and PV will be filled by the DCF module
      discountFactor: 0,
      pvFCF: 0,
    });

    prevNetRevenue = row.netRevenue;
  }

  return years;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
