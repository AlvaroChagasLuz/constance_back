import type { WACCParameters, WACCResult } from './types';

export function calculateWACC(params: WACCParameters): WACCResult {
  const {
    riskFreeRate, leveredBeta, equityRiskPremium,
    sizePremium, countryRiskPremium, companySpecificRisk,
    costOfDebt, taxRateForDebt, equityValue, debtValue,
  } = params;

  // CAPM: Ke = Rf + β × ERP + Size Premium + CRP + Company-specific
  const costOfEquity =
    riskFreeRate +
    leveredBeta * equityRiskPremium +
    sizePremium +
    countryRiskPremium +
    companySpecificRisk;

  // Kd after tax
  const costOfDebtAfterTax = costOfDebt * (1 - taxRateForDebt / 100);

  // Weights
  const totalCapital = equityValue + debtValue;
  const equityWeight = totalCapital > 0 ? equityValue / totalCapital : 1;
  const debtWeight = totalCapital > 0 ? debtValue / totalCapital : 0;

  // WACC
  const wacc = equityWeight * costOfEquity + debtWeight * costOfDebtAfterTax;

  return { costOfEquity, costOfDebtAfterTax, equityWeight, debtWeight, wacc };
}
