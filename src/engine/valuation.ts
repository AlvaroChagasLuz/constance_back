import type {
  FCFAssumptions,
  WACCResult,
  TerminalValueParameters,
  EquityBridgeParameters,
  ProjectedYear,
  ValuationResult,
  SensitivityMatrix,
} from './types';
import type { SpreadsheetData } from '@/types/spreadsheet';
import {
  findNetRevenueRow,
  findEBITDARow,
  findDARow,
  findEBITRow,
} from '@/utils/projectionUtils';

/**
 * Build projected years from the spreadsheet projected columns.
 */
export function buildProjectedYears(
  data: SpreadsheetData,
  originalColCount: number,
  fcfAssumptions: FCFAssumptions,
  waccResult: WACCResult,
  taxRate: number,
): ProjectedYear[] {
  const ebitdaRow = findEBITDARow(data);
  const daRow = findDARow(data);
  const ebitRow = findEBITRow(data);
  const netRevRow = findNetRevenueRow(data);

  if (ebitdaRow === null || ebitRow === null) return [];

  const years: ProjectedYear[] = [];
  let prevWC = 0;

  for (let c = originalColCount; c < data.colCount; c++) {
    const yearIdx = c - originalColCount;
    const yearLabel = data.values[0]?.[c] ?? (yearIdx + 1);

    const getVal = (row: number | null) => {
      if (row === null) return 0;
      const v = data.values[row]?.[c];
      if (v == null) return 0;
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    };

    const ebitda = getVal(ebitdaRow);
    const da = Math.abs(getVal(daRow));
    const ebit = getVal(ebitRow);
    const netRev = getVal(netRevRow);

    // NOPAT
    const nopat = ebit > 0 ? ebit * (1 - taxRate / 100) : ebit;

    // CapEx
    let capex: number;
    if (fcfAssumptions.capexMethod === 'equals_da') {
      capex = da;
    } else {
      capex = Math.abs(netRev) * (fcfAssumptions.capexPercentOfRevenue / 100);
    }

    // Working Capital
    let currentWC: number;
    if (fcfAssumptions.workingCapitalMethod === 'percent_of_revenue') {
      currentWC = Math.abs(netRev) * (fcfAssumptions.wcPercentOfRevenue / 100);
    } else {
      const dailyRev = Math.abs(netRev) / 365;
      const receivables = dailyRev * fcfAssumptions.wcDSO;
      const inventory = dailyRev * fcfAssumptions.wcDIO;
      const payables = dailyRev * fcfAssumptions.wcDPO;
      currentWC = receivables + inventory - payables;
    }
    const deltaWC = yearIdx === 0 ? 0 : currentWC - prevWC;
    prevWC = currentWC;

    // FCFF = NOPAT + D&A - CapEx - ΔWC
    const fcff = nopat + da - capex - deltaWC;

    // Discount factor
    const discountFactor = 1 / Math.pow(1 + waccResult.wacc / 100, yearIdx + 1);
    const pvFCF = fcff * discountFactor;

    years.push({
      year: yearLabel as number | string,
      ebitda, da, ebit, nopat,
      capex, deltaWC, fcff,
      discountFactor, pvFCF,
    });
  }

  return years;
}

/**
 * Calculate full valuation result.
 */
export function calculateValuation(
  projectedYears: ProjectedYear[],
  waccResult: WACCResult,
  tvParams: TerminalValueParameters,
  equityBridge: EquityBridgeParameters,
): ValuationResult {
  const pvOfFCFs = projectedYears.reduce((sum, y) => sum + y.pvFCF, 0);
  const n = projectedYears.length;
  const lastYear = projectedYears[n - 1];
  const lastFCF = lastYear?.fcff ?? 0;
  const lastEBITDA = lastYear?.ebitda ?? 0;
  const wacc = waccResult.wacc / 100;
  const g = tvParams.perpetuityGrowthRate / 100;
  const terminalDiscountFactor = 1 / Math.pow(1 + wacc, n);

  // Gordon Growth TV
  let tvGordon: number | null = null;
  let pvTVGordon: number | null = null;
  let evGordon: number | null = null;
  let eqGordon: number | null = null;
  let ppsGordon: number | null = null;
  let tvPctGordon: number | null = null;

  if (tvParams.method === 'gordon_growth' || tvParams.method === 'both') {
    if (wacc > g) {
      tvGordon = (lastFCF * (1 + g)) / (wacc - g);
      pvTVGordon = tvGordon * terminalDiscountFactor;
      evGordon = pvOfFCFs + pvTVGordon;
      eqGordon = evGordon - equityBridge.totalDebt + equityBridge.cashAndEquivalents + equityBridge.nonOperatingAssets - equityBridge.minorityInterest;
      ppsGordon = eqGordon / (equityBridge.sharesOutstanding || 1);
      tvPctGordon = evGordon > 0 ? (pvTVGordon / evGordon) * 100 : null;
    }
  }

  // Exit Multiple TV
  let tvExitMultiple: number | null = null;
  let pvTVExitMultiple: number | null = null;
  let evExitMultiple: number | null = null;
  let eqExitMultiple: number | null = null;
  let ppsExitMultiple: number | null = null;
  let tvPctExitMultiple: number | null = null;

  if (tvParams.method === 'exit_multiple' || tvParams.method === 'both') {
    tvExitMultiple = lastEBITDA * tvParams.exitMultiple;
    pvTVExitMultiple = tvExitMultiple * terminalDiscountFactor;
    evExitMultiple = pvOfFCFs + pvTVExitMultiple;
    eqExitMultiple = evExitMultiple - equityBridge.totalDebt + equityBridge.cashAndEquivalents + equityBridge.nonOperatingAssets - equityBridge.minorityInterest;
    ppsExitMultiple = eqExitMultiple / (equityBridge.sharesOutstanding || 1);
    tvPctExitMultiple = evExitMultiple > 0 ? (pvTVExitMultiple / evExitMultiple) * 100 : null;
  }

  return {
    pvOfFCFs,
    terminalValue: { gordonGrowth: tvGordon, exitMultiple: tvExitMultiple },
    pvTerminalValueGordon: pvTVGordon,
    pvTerminalValueExitMultiple: pvTVExitMultiple,
    enterpriseValueGordon: evGordon,
    enterpriseValueExitMultiple: evExitMultiple,
    equityValueGordon: eqGordon,
    equityValueExitMultiple: eqExitMultiple,
    pricePerShareGordon: ppsGordon,
    pricePerShareExitMultiple: ppsExitMultiple,
    tvAsPercentOfEVGordon: tvPctGordon,
    tvAsPercentOfEVExitMultiple: tvPctExitMultiple,
  };
}

/**
 * Build sensitivity matrix: WACC vs Perpetuity Growth Rate.
 */
export function buildSensitivityGrowth(
  projectedYears: ProjectedYear[],
  baseWACC: number,
  baseGrowth: number,
  equityBridge: EquityBridgeParameters,
): SensitivityMatrix {
  const steps = [-2, -1, 0, 1, 2];
  const waccValues = steps.map(s => baseWACC + s);
  const growthValues = steps.map(s => baseGrowth + s * 0.5);

  const n = projectedYears.length;
  const lastFCF = projectedYears[n - 1]?.fcff ?? 0;
  const pvOfFCFsBase = projectedYears.reduce((sum, y) => sum + y.pvFCF, 0);

  const matrix = waccValues.map(w => {
    const wacc = w / 100;
    return growthValues.map(g => {
      const growth = g / 100;
      if (wacc <= growth) return 0;
      const tv = (lastFCF * (1 + growth)) / (wacc - growth);
      const pvTV = tv / Math.pow(1 + wacc, n);
      const ev = pvOfFCFsBase + pvTV;
      return ev - equityBridge.totalDebt + equityBridge.cashAndEquivalents + equityBridge.nonOperatingAssets - equityBridge.minorityInterest;
    });
  });

  return {
    rowLabel: 'WACC',
    colLabel: 'g',
    rowValues: waccValues,
    colValues: growthValues,
    matrix,
    baseRowIndex: 2,
    baseColIndex: 2,
  };
}
