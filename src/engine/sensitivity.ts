/**
 * Constance Valuation Engine — Sensitivity Analysis
 *
 * Generates sensitivity tables (data tables) that show how equity value
 * changes as key assumptions vary. The standard IB output is a
 * WACC vs. Perpetuity Growth Rate matrix.
 *
 * No React dependencies — testable independently.
 */

import type {
  ProjectedYear,
  TerminalValueParameters,
  EquityBridgeParameters,
  SensitivityMatrix,
} from './types';
import { buildFCFProjections } from './fcf';
import { runDCFValuation } from './dcf';

/**
 * Generate a WACC vs. Perpetuity Growth sensitivity matrix.
 *
 * This is the most common sensitivity table in IB valuation decks.
 * Rows = WACC values, Columns = Perpetuity Growth Rate values.
 * Each cell = Implied Equity Value (Gordon Growth method).
 *
 * The matrix uses the pre-computed projected FCFs and re-runs only
 * the discounting + Terminal Value for each (WACC, g) pair.
 *
 * @param projectedYears - Already computed FCF projections
 * @param baseWACC - Base case WACC (%)
 * @param baseTVParams - Base case Terminal Value parameters
 * @param bridge - Equity Bridge parameters
 * @param waccSteps - Number of steps above and below base WACC (default 4)
 * @param waccIncrement - Increment per step in % (default 0.5)
 * @param growthSteps - Number of steps above and below base growth (default 4)
 * @param growthIncrement - Increment per step in % (default 0.5)
 */
export function buildWACCvsGrowthSensitivity(
  projectedYears: ProjectedYear[],
  baseWACC: number,
  baseTVParams: TerminalValueParameters,
  bridge: EquityBridgeParameters,
  waccSteps: number = 4,
  waccIncrement: number = 0.5,
  growthSteps: number = 4,
  growthIncrement: number = 0.5
): SensitivityMatrix {
  // Build row values (WACC variations) — ascending
  const rowValues: number[] = [];
  for (let i = -waccSteps; i <= waccSteps; i++) {
    const v = round1(baseWACC + i * waccIncrement);
    if (v > 0) rowValues.push(v); // WACC must be positive
  }

  // Build column values (Growth Rate variations) — ascending
  const baseGrowth = baseTVParams.perpetuityGrowthRate;
  const colValues: number[] = [];
  for (let i = -growthSteps; i <= growthSteps; i++) {
    const v = round1(baseGrowth + i * growthIncrement);
    if (v >= 0) colValues.push(v); // growth rate >= 0
  }

  // Find base case indices
  const baseRowIndex = rowValues.findIndex(v => Math.abs(v - baseWACC) < 0.001);
  const baseColIndex = colValues.findIndex(v => Math.abs(v - baseGrowth) < 0.001);

  // Build the matrix
  const matrix: number[][] = [];

  for (const wacc of rowValues) {
    const row: number[] = [];
    for (const growth of colValues) {
      // Clone projected years (we need fresh copies since applyDiscounting mutates)
      const clonedYears = projectedYears.map(y => ({ ...y }));

      // Override TV params for this cell
      const tvParams: TerminalValueParameters = {
        method: 'gordon_growth',
        perpetuityGrowthRate: growth,
        exitMultiple: baseTVParams.exitMultiple,
      };

      // Run DCF with this (WACC, growth) pair
      const result = runDCFValuation(clonedYears, wacc, tvParams, bridge);
      row.push(result.equityValueGordon ?? 0);
    }
    matrix.push(row);
  }

  return {
    rowLabel: 'WACC (%)',
    colLabel: 'Perpetuity Growth (%)',
    rowValues,
    colValues,
    matrix,
    baseRowIndex: baseRowIndex >= 0 ? baseRowIndex : Math.floor(rowValues.length / 2),
    baseColIndex: baseColIndex >= 0 ? baseColIndex : Math.floor(colValues.length / 2),
  };
}

/**
 * Generate a WACC vs. Exit Multiple sensitivity matrix.
 *
 * Alternative to the growth matrix — uses Exit Multiple method instead.
 * Rows = WACC values, Columns = EV/EBITDA exit multiples.
 */
export function buildWACCvsExitMultipleSensitivity(
  projectedYears: ProjectedYear[],
  baseWACC: number,
  baseTVParams: TerminalValueParameters,
  bridge: EquityBridgeParameters,
  waccSteps: number = 4,
  waccIncrement: number = 0.5,
  multipleSteps: number = 4,
  multipleIncrement: number = 0.5
): SensitivityMatrix {
  // Build row values (WACC variations)
  const rowValues: number[] = [];
  for (let i = -waccSteps; i <= waccSteps; i++) {
    const v = round1(baseWACC + i * waccIncrement);
    if (v > 0) rowValues.push(v);
  }

  // Build column values (Exit Multiple variations)
  const baseMultiple = baseTVParams.exitMultiple;
  const colValues: number[] = [];
  for (let i = -multipleSteps; i <= multipleSteps; i++) {
    const v = round1(baseMultiple + i * multipleIncrement);
    if (v > 0) colValues.push(v);
  }

  const baseRowIndex = rowValues.findIndex(v => Math.abs(v - baseWACC) < 0.001);
  const baseColIndex = colValues.findIndex(v => Math.abs(v - baseMultiple) < 0.001);

  const matrix: number[][] = [];

  for (const wacc of rowValues) {
    const row: number[] = [];
    for (const multiple of colValues) {
      const clonedYears = projectedYears.map(y => ({ ...y }));

      const tvParams: TerminalValueParameters = {
        method: 'exit_multiple',
        perpetuityGrowthRate: baseTVParams.perpetuityGrowthRate,
        exitMultiple: multiple,
      };

      const result = runDCFValuation(clonedYears, wacc, tvParams, bridge);
      row.push(result.equityValueExitMultiple ?? 0);
    }
    matrix.push(row);
  }

  return {
    rowLabel: 'WACC (%)',
    colLabel: 'EV/EBITDA Exit Multiple (x)',
    rowValues,
    colValues,
    matrix,
    baseRowIndex: baseRowIndex >= 0 ? baseRowIndex : Math.floor(rowValues.length / 2),
    baseColIndex: baseColIndex >= 0 ? baseColIndex : Math.floor(colValues.length / 2),
  };
}

/** Round to 1 decimal place */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
