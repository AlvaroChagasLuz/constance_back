/**
 * Constance Valuation Engine — DCF Valuation
 *
 * Pure functions for the complete Discounted Cash Flow calculation:
 * - Present Value of projected FCFs
 * - Terminal Value (Gordon Growth + Exit Multiple)
 * - Enterprise Value
 * - Equity Value via the equity bridge
 *
 * No React dependencies — testable independently.
 */

import type {
  ProjectedYear,
  TerminalValueParameters,
  TerminalValueResult,
  EquityBridgeParameters,
  ValuationResult,
} from './types';

// ============================================================================
// Discounting
// ============================================================================

/**
 * Calculate the discount factor for year n.
 *
 * Discount Factor = 1 / (1 + WACC)^n
 *
 * Convention: n = 1 for the first projection year (mid-year convention
 * is NOT applied here for simplicity; can be added later as a toggle).
 */
export function discountFactor(wacc: number, yearNumber: number): number {
  return 1 / Math.pow(1 + wacc / 100, yearNumber);
}

/**
 * Apply discount factors to all projected years and compute PV of each FCF.
 *
 * Mutates the projectedYears array in place for efficiency.
 * Returns the sum of all PV(FCF)s.
 */
export function applyDiscounting(
  projectedYears: ProjectedYear[],
  wacc: number
): number {
  let sumPV = 0;

  for (let i = 0; i < projectedYears.length; i++) {
    const year = projectedYears[i];
    const n = i + 1; // year 1, 2, 3, ...
    const df = discountFactor(wacc, n);
    year.discountFactor = round4(df);
    year.pvFCF = round2(year.fcff * df);
    sumPV += year.pvFCF;
  }

  return round2(sumPV);
}

// ============================================================================
// Terminal Value
// ============================================================================

/**
 * Calculate Terminal Value using the Gordon Growth Model (Perpetuity).
 *
 * TV = FCF_last × (1 + g) / (WACC - g)
 *
 * Constraints:
 * - WACC must be greater than g (otherwise TV is infinite/negative)
 * - g should be ≤ long-term GDP growth + inflation (usually 2-4%)
 *
 * Returns null if the calculation is invalid (g >= WACC).
 */
export function gordonGrowthTerminalValue(
  lastFCF: number,
  perpetuityGrowthRate: number,
  wacc: number
): number | null {
  const g = perpetuityGrowthRate / 100;
  const w = wacc / 100;

  if (w <= g) {
    // Invalid: WACC must exceed growth rate
    return null;
  }

  return lastFCF * (1 + g) / (w - g);
}

/**
 * Calculate Terminal Value using the Exit Multiple method.
 *
 * TV = EBITDA_last × EV/EBITDA_multiple
 *
 * This method assumes the company is sold at the end of the projection
 * period at the given EV/EBITDA multiple. It's a market-based approach
 * that complements the Gordon Growth intrinsic approach.
 */
export function exitMultipleTerminalValue(
  lastEBITDA: number,
  exitMultiple: number
): number {
  return Math.abs(lastEBITDA) * exitMultiple;
}

/**
 * Calculate the full Terminal Value result with both methods.
 *
 * Returns PV of Terminal Value in addition to the nominal values,
 * since TV is discounted by the same factor as the last year.
 */
export function calculateTerminalValue(
  projectedYears: ProjectedYear[],
  params: TerminalValueParameters,
  wacc: number
): TerminalValueResult {
  if (projectedYears.length === 0) {
    return {
      gordonGrowth: null,
      exitMultiple: null,
      pvGordonGrowth: null,
      pvExitMultiple: null,
    };
  }

  const lastYear = projectedYears[projectedYears.length - 1];
  const n = projectedYears.length; // Terminal value is at the end of last year
  const df = discountFactor(wacc, n);

  let gordonGrowthTV: number | null = null;
  let exitMultipleTV: number | null = null;
  let pvGordon: number | null = null;
  let pvExit: number | null = null;

  if (params.method === 'gordon_growth' || params.method === 'both') {
    gordonGrowthTV = gordonGrowthTerminalValue(
      lastYear.fcff,
      params.perpetuityGrowthRate,
      wacc
    );
    if (gordonGrowthTV !== null) {
      pvGordon = round2(gordonGrowthTV * df);
      gordonGrowthTV = round2(gordonGrowthTV);
    }
  }

  if (params.method === 'exit_multiple' || params.method === 'both') {
    exitMultipleTV = exitMultipleTerminalValue(lastYear.ebitda, params.exitMultiple);
    pvExit = round2(exitMultipleTV * df);
    exitMultipleTV = round2(exitMultipleTV);
  }

  return {
    gordonGrowth: gordonGrowthTV,
    exitMultiple: exitMultipleTV,
    pvGordonGrowth: pvGordon,
    pvExitMultiple: pvExit,
  };
}

// ============================================================================
// Enterprise Value → Equity Value
// ============================================================================

/**
 * Calculate Enterprise Value.
 *
 * EV = PV of projected FCFs + PV of Terminal Value
 */
export function calculateEnterpriseValue(
  pvOfFCFs: number,
  pvOfTerminalValue: number
): number {
  return round2(pvOfFCFs + pvOfTerminalValue);
}

/**
 * Calculate Equity Value from Enterprise Value.
 *
 * Equity Value = EV - Total Debt + Cash & Equivalents
 *                + Non-operating Assets - Minority Interest
 *
 * This is the "equity bridge" that converts firm value to equity value.
 */
export function calculateEquityValue(
  enterpriseValue: number,
  bridge: EquityBridgeParameters
): number {
  return round2(
    enterpriseValue
    - bridge.totalDebt
    + bridge.cashAndEquivalents
    + bridge.nonOperatingAssets
    - bridge.minorityInterest
  );
}

/**
 * Calculate implied price per share.
 */
export function calculatePricePerShare(
  equityValue: number,
  sharesOutstanding: number
): number {
  if (sharesOutstanding <= 0) return 0;
  return round2(equityValue / sharesOutstanding);
}

// ============================================================================
// Full DCF Orchestrator
// ============================================================================

/**
 * Run the complete DCF valuation and return all results.
 *
 * This is the main entry point that chains:
 * 1. Discount the FCFs
 * 2. Calculate Terminal Value
 * 3. Enterprise Value
 * 4. Equity Value via the bridge
 * 5. Per-share price
 *
 * The projectedYears array is mutated to include discount factors and PVs.
 */
export function runDCFValuation(
  projectedYears: ProjectedYear[],
  wacc: number,
  tvParams: TerminalValueParameters,
  bridge: EquityBridgeParameters
): ValuationResult {
  // Step 1: Discount all projected FCFs
  const pvOfFCFs = applyDiscounting(projectedYears, wacc);

  // Step 2: Terminal Value
  const tv = calculateTerminalValue(projectedYears, tvParams, wacc);

  // Step 3 & 4: EV and Equity Value for each TV method
  let evGordon: number | null = null;
  let evExit: number | null = null;
  let eqGordon: number | null = null;
  let eqExit: number | null = null;
  let ppsGordon: number | null = null;
  let ppsExit: number | null = null;
  let tvPctGordon: number | null = null;
  let tvPctExit: number | null = null;

  if (tv.pvGordonGrowth !== null) {
    evGordon = calculateEnterpriseValue(pvOfFCFs, tv.pvGordonGrowth);
    eqGordon = calculateEquityValue(evGordon, bridge);
    ppsGordon = calculatePricePerShare(eqGordon, bridge.sharesOutstanding);
    tvPctGordon = evGordon > 0
      ? round2((tv.pvGordonGrowth / evGordon) * 100)
      : null;
  }

  if (tv.pvExitMultiple !== null) {
    evExit = calculateEnterpriseValue(pvOfFCFs, tv.pvExitMultiple);
    eqExit = calculateEquityValue(evExit, bridge);
    ppsExit = calculatePricePerShare(eqExit, bridge.sharesOutstanding);
    tvPctExit = evExit > 0
      ? round2((tv.pvExitMultiple / evExit) * 100)
      : null;
  }

  return {
    pvOfFCFs,
    terminalValue: tv,
    enterpriseValueGordon: evGordon,
    enterpriseValueExitMultiple: evExit,
    equityValueGordon: eqGordon,
    equityValueExitMultiple: eqExit,
    pricePerShareGordon: ppsGordon,
    pricePerShareExitMultiple: ppsExit,
    tvAsPercentOfEVGordon: tvPctGordon,
    tvAsPercentOfEVExitMultiple: tvPctExit,
  };
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimal places (for discount factors) */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
