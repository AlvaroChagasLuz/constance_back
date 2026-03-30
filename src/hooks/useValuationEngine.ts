/**
 * useValuationEngine — Central state management hook for the valuation workflow.
 *
 * Replaces the 15+ useState / useCallback pairs in pages/App.tsx with a
 * single structured state object and action handlers.
 *
 * All business logic (projection application, assumption tracking,
 * DCF calculations) is routed through this hook. The UI components
 * only need to call the action handlers and read the state.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { SpreadsheetData, YearsRowData } from '@/types/spreadsheet';
import type {
  ValuationStep,
  IncomeStatementAssumptions,
  FCFAssumptions,
  WACCParameters,
  TerminalValueParameters,
  EquityBridgeParameters,
  WACCResult,
  ValuationResult,
  SensitivityMatrix,
  ProjectedYear,
} from '@/engine/types';
import {
  DEFAULT_INCOME_STATEMENT_ASSUMPTIONS,
  DEFAULT_FCF_ASSUMPTIONS,
  DEFAULT_WACC_PARAMETERS,
  DEFAULT_TERMINAL_VALUE_PARAMETERS,
  DEFAULT_EQUITY_BRIDGE,
} from '@/engine/types';
import {
  addProjectionColumns,
  applyRevenueProjection,
  applyDeductionsProjection,
  applyCOGSProjection,
  applySGAProjection,
  applyDAProjection,
  applyFinancialResultProjection,
  applyTaxProjection,
  findRevenueRow,
  findNetRevenueRow,
  findCOGSRow,
  findGrossProfitRow,
  findSGARow,
  findEBITDARow,
  findDARow,
  findEBITRow,
  findFinancialResultRow,
  findEBTRow,
  findTaxRow,
  findNetIncomeRow,
  getProjectedEBT,
} from '@/utils/projectionUtils';
import {
  buildAssumptionsSheet,
  buildAssumptionsRowMap,
  type AssumptionEntry,
} from '@/utils/assumptionsSheetBuilder';
import {
  detectYearsRow,
  detectLastYearFromData,
} from '@/utils/yearsRowDetector';
import { calculateWACC } from '@/engine/wacc';
import { buildFCFProjections } from '@/engine/fcf';
import { runDCFValuation } from '@/engine/dcf';
import {
  buildWACCvsGrowthSensitivity,
  buildWACCvsExitMultipleSensitivity,
} from '@/engine/sensitivity';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// State interface
// ============================================================================

export interface ValuationEngineState {
  // Current wizard step
  step: ValuationStep;

  // Spreadsheet data
  leftSpreadsheetData: SpreadsheetData | null;
  rightSpreadsheetData: SpreadsheetData | null;
  baseSheetData: SpreadsheetData | null;
  originalRightData: SpreadsheetData | null;
  projectedBaseData: SpreadsheetData | null;
  originalColCount: number;

  // Assumptions sheet
  assumptionsSheetData: SpreadsheetData | null;
  assumptionEntries: AssumptionEntry[];

  // Year detection
  yearsRowData: YearsRowData | null;
  yearsRowWarning: string | null;

  // Income statement tracking
  hasAppliedRevenue: boolean;

  // Assumptions (structured)
  incomeStatement: IncomeStatementAssumptions;
  fcfAssumptions: FCFAssumptions;
  waccParams: WACCParameters;
  tvParams: TerminalValueParameters;
  equityBridge: EquityBridgeParameters;

  // Computed results
  waccResult: WACCResult | null;
  projectedYears: ProjectedYear[];
  valuationResult: ValuationResult | null;
  sensitivityGrowth: SensitivityMatrix | null;
  sensitivityMultiple: SensitivityMatrix | null;
}

// ============================================================================
// Action handlers type
// ============================================================================

export interface ValuationEngineActions {
  // Data import
  setLeftSpreadsheetData: (data: SpreadsheetData | null) => void;

  // Confirmation
  handleConfirm: () => void;
  handleReject: () => void;

  // Modelling
  handleModellingContinue: (years: number) => void;

  // Income statement steps
  handleApplyRevenue: (rate: number) => void;
  handleAssumptionsContinue: () => void;
  handleDeductionsContinue: (pct: number) => void;
  handleCOGSContinue: (pct: number) => void;
  handleSGAContinue: (pct: number) => void;
  handleDAContinue: (pct: number) => void;
  handleFinancialResultContinue: (pct: number) => void;
  handleTaxContinue: (pct: number) => void;

  // New DCF steps
  handleCapexWCContinue: (fcf: FCFAssumptions) => void;
  handleWACCContinue: (params: WACCParameters) => void;
  handleTerminalValueContinue: (params: TerminalValueParameters) => void;
  handleEquityBridgeContinue: (params: EquityBridgeParameters) => void;

  // Navigation
  handleStepBack: () => void;

  // Computed values (for UI)
  getProjectedEBTValue: () => number | null;
}

// ============================================================================
// Step ordering for back navigation
// ============================================================================

const STEP_ORDER: ValuationStep[] = [
  'import',
  'confirm',
  'modelling',
  'assumptions',
  'deductions',
  'cogs',
  'sga',
  'da',
  'financial_result',
  'tax',
  'capex_wc',
  'wacc',
  'terminal_value',
  'equity_bridge',
  'results',
];

function getPreviousStep(current: ValuationStep): ValuationStep {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : current;
}

// ============================================================================
// Deep copy helper
// ============================================================================

function deepCopySpreadsheet(src: SpreadsheetData): SpreadsheetData {
  return {
    values: src.values.map(row => [...row]),
    formulas: src.formulas?.map(row => [...row]),
    formats: src.formats?.map(row => row.map(f => f ? { ...f } : null)),
    mergedCells: src.mergedCells?.map(m => ({ ...m })),
    columnWidths: src.columnWidths ? [...src.columnWidths] : undefined,
    rowHeights: src.rowHeights ? [...src.rowHeights] : undefined,
    rowCount: src.rowCount,
    colCount: src.colCount,
    startRow: src.startRow,
    startCol: src.startCol,
  };
}

// ============================================================================
// Helper: extract IS values from spreadsheet for a given column
// ============================================================================

function extractISValues(
  data: SpreadsheetData,
  colIndex: number
): {
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
} {
  const getVal = (rowFn: (d: SpreadsheetData) => number | null): number => {
    const row = rowFn(data);
    if (row === null) return 0;
    const val = data.values[row]?.[colIndex];
    if (val == null) return 0;
    return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
  };

  return {
    grossRevenue: getVal(d => findRevenueRow(d)),
    deductions: getVal(d => {
      // Use findRowByPatterns via the deductions finder
      const maxLabelCols = Math.min(5, d.colCount);
      for (let r = 0; r < d.values.length; r++) {
        const row = d.values[r];
        if (!row) continue;
        for (let c = 0; c < maxLabelCols; c++) {
          const v = row[c];
          if (v == null) continue;
          const t = String(v).trim().toLowerCase();
          if (t.includes('deduç') || t.includes('deducoes') || t.includes('deductions')) return r;
        }
      }
      return null;
    }),
    netRevenue: getVal(d => findNetRevenueRow(d)),
    cogs: getVal(d => findCOGSRow(d)),
    grossProfit: getVal(d => findGrossProfitRow(d)),
    sga: getVal(d => findSGARow(d)),
    ebitda: getVal(d => findEBITDARow(d)),
    da: getVal(d => findDARow(d)),
    ebit: getVal(d => findEBITRow(d)),
    financialResult: getVal(d => findFinancialResultRow(d)),
    ebt: getVal(d => findEBTRow(d)),
    tax: getVal(d => findTaxRow(d)),
    netIncome: getVal(d => findNetIncomeRow(d)),
  };
}

// ============================================================================
// The Hook
// ============================================================================

export function useValuationEngine(): [ValuationEngineState, ValuationEngineActions] {
  const { toast } = useToast();

  // --- Core spreadsheet state ---
  const [leftSpreadsheetData, setLeftData] = useState<SpreadsheetData | null>(null);
  const [rightSpreadsheetData, setRightData] = useState<SpreadsheetData | null>(null);
  const [baseSheetData, setBaseSheetData] = useState<SpreadsheetData | null>(null);
  const [originalRightData, setOriginalRightData] = useState<SpreadsheetData | null>(null);
  const [projectedBaseData, setProjectedBaseData] = useState<SpreadsheetData | null>(null);
  const [originalColCount, setOriginalColCount] = useState(0);

  // --- Wizard step ---
  const [step, setStep] = useState<ValuationStep>('import');

  // --- Assumptions tracking ---
  const [assumptionsSheetData, setAssumptionsSheetData] = useState<SpreadsheetData | null>(null);
  const [assumptionEntries, setAssumptionEntries] = useState<AssumptionEntry[]>([]);
  const [yearsRowData, setYearsRowData] = useState<YearsRowData | null>(null);
  const [yearsRowWarning, setYearsRowWarning] = useState<string | null>(null);
  const [hasAppliedRevenue, setHasAppliedRevenue] = useState(false);

  // --- Structured assumptions ---
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementAssumptions>({ ...DEFAULT_INCOME_STATEMENT_ASSUMPTIONS });
  const [fcfAssumptions, setFcfAssumptions] = useState<FCFAssumptions>({ ...DEFAULT_FCF_ASSUMPTIONS });
  const [waccParams, setWaccParams] = useState<WACCParameters>({ ...DEFAULT_WACC_PARAMETERS });
  const [tvParams, setTvParams] = useState<TerminalValueParameters>({ ...DEFAULT_TERMINAL_VALUE_PARAMETERS });
  const [equityBridge, setEquityBridge] = useState<EquityBridgeParameters>({ ...DEFAULT_EQUITY_BRIDGE });

  // --- Computed results ---
  const [waccResult, setWaccResult] = useState<WACCResult | null>(null);
  const [projectedYears, setProjectedYears] = useState<ProjectedYear[]>([]);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const [sensitivityGrowth, setSensitivityGrowth] = useState<SensitivityMatrix | null>(null);
  const [sensitivityMultiple, setSensitivityMultiple] = useState<SensitivityMatrix | null>(null);

  // ========== Helper: update assumption entries + sheet ==========
  const updateAssumptions = useCallback(
    (label: string, category: string, value: number, unit: string, entries: AssumptionEntry[]) => {
      const newEntries = [
        ...entries.filter(e => e.label !== label),
        { category, label, value, unit },
      ];
      setAssumptionEntries(newEntries);
      setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
      return newEntries;
    },
    []
  );

  // ========== Auto-mirror left → right on import ==========
  useEffect(() => {
    if (step !== 'import') return;
    if (leftSpreadsheetData) {
      const copy = deepCopySpreadsheet(leftSpreadsheetData);
      setBaseSheetData(deepCopySpreadsheet(leftSpreadsheetData));
      setRightData(copy);
      setOriginalRightData(copy);
      setOriginalColCount(copy.colCount);
      setStep('confirm');
    } else {
      setRightData(null);
      setBaseSheetData(null);
    }
  }, [leftSpreadsheetData]);

  // ========== Action handlers ==========

  const setLeftSpreadsheetData = useCallback((data: SpreadsheetData | null) => {
    setLeftData(data);
  }, []);

  const handleConfirm = useCallback(() => {
    setStep('modelling');
    toast({ title: 'Dados confirmados!', description: 'Configure a modelagem financeira no painel esquerdo.' });
  }, [toast]);

  const handleReject = useCallback(() => {
    setLeftData(null);
    setRightData(null);
    setBaseSheetData(null);
    setOriginalRightData(null);
    setProjectedBaseData(null);
    setOriginalColCount(0);
    setHasAppliedRevenue(false);
    setAssumptionsSheetData(null);
    setAssumptionEntries([]);
    setYearsRowData(null);
    setYearsRowWarning(null);
    setIncomeStatement({ ...DEFAULT_INCOME_STATEMENT_ASSUMPTIONS });
    setFcfAssumptions({ ...DEFAULT_FCF_ASSUMPTIONS });
    setWaccParams({ ...DEFAULT_WACC_PARAMETERS });
    setTvParams({ ...DEFAULT_TERMINAL_VALUE_PARAMETERS });
    setEquityBridge({ ...DEFAULT_EQUITY_BRIDGE });
    setWaccResult(null);
    setProjectedYears([]);
    setValuationResult(null);
    setSensitivityGrowth(null);
    setSensitivityMultiple(null);
    setStep('import');
  }, []);

  const handleModellingContinue = useCallback((years: number) => {
    if (!originalRightData) return;
    const lastClosedYear = detectLastYearFromData(originalRightData) ?? (new Date().getFullYear() - 1);
    const detection = detectYearsRow(originalRightData, lastClosedYear);
    if (detection.success && detection.data) {
      setYearsRowData(detection.data);
      setYearsRowWarning(null);
    } else {
      setYearsRowWarning(detection.warning || null);
    }
    const projected = addProjectionColumns(originalRightData, years);
    setRightData(projected);
    setProjectedBaseData(projected);
    setIncomeStatement(prev => ({ ...prev, projectionYears: years }));
    setStep('assumptions');
    if (detection.success) {
      const updated = detectYearsRow(projected, lastClosedYear);
      if (updated.success && updated.data) setYearsRowData(updated.data);
    }
    setAssumptionsSheetData(buildAssumptionsSheet([]));
    toast({ title: `${years} ano${years > 1 ? 's' : ''} adicionado${years > 1 ? 's' : ''}!`, description: `Projeção a partir de ${lastClosedYear + 1}. Defina as premissas.` });
  }, [originalRightData, toast]);

  const handleApplyRevenue = useCallback((rate: number) => {
    if (!projectedBaseData) return;
    const newEntries = updateAssumptions('Taxa de Crescimento de Receita', 'Receita', rate, '% a.a.', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Taxa de Crescimento de Receita');
    const projected = applyRevenueProjection(projectedBaseData, rate, originalColCount, premissasRow);
    setRightData(projected);
    setHasAppliedRevenue(true);
    setIncomeStatement(prev => ({ ...prev, revenueGrowthRate: rate }));
    toast({ title: 'Projeção de receita aplicada!', description: `Taxa de crescimento: ${rate}% ao ano` });
  }, [projectedBaseData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleAssumptionsContinue = useCallback(() => {
    setStep('deductions');
    toast({ title: 'Projeção de receita confirmada!', description: 'Defina as deduções sobre a receita bruta.' });
  }, [toast]);

  const handleDeductionsContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('Deduções sobre Receita Bruta', 'Deduções', pct, '% da Receita Bruta', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Deduções sobre Receita Bruta');
    const updated = applyDeductionsProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, deductionsPercent: pct }));
    setStep('cogs');
    toast({ title: 'Deduções aplicadas!', description: `${pct}% de deduções projetadas.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleCOGSContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('Custo (CMV) sobre Receita Líquida', 'Custos', pct, '% da Receita Líquida', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Custo (CMV) sobre Receita Líquida');
    const updated = applyCOGSProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, cogsPercent: pct }));
    setStep('sga');
    toast({ title: 'Custos aplicados!', description: `${pct}% de CMV projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleSGAContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('Despesas (SG&A) sobre Lucro Bruto', 'Despesas', pct, '% do Lucro Bruto', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Despesas (SG&A) sobre Lucro Bruto');
    const updated = applySGAProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, sgaPercent: pct }));
    setStep('da');
    toast({ title: 'Despesas aplicadas!', description: `${pct}% de SG&A projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleDAContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('D&A sobre Receita Líquida', 'D&A', pct, '% da Receita Líquida', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('D&A sobre Receita Líquida');
    const updated = applyDAProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, daPercent: pct }));
    setStep('financial_result');
    toast({ title: 'D&A aplicada!', description: `${pct}% de D&A projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleFinancialResultContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('Resultado Financeiro sobre Receita Líquida', 'Resultado Financeiro', pct, '% da Receita Líquida', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Resultado Financeiro sobre Receita Líquida');
    const updated = applyFinancialResultProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, financialResultPercent: pct }));
    setStep('tax');
    toast({ title: 'Resultado Financeiro aplicado!', description: `${pct}% projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  const handleTaxContinue = useCallback((pct: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries = updateAssumptions('Impostos sobre EBT', 'Impostos', pct, '% do EBT', assumptionEntries);
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Impostos sobre EBT');
    const updated = applyTaxProjection(rightSpreadsheetData, pct, originalColCount, premissasRow);
    setRightData(updated);
    setIncomeStatement(prev => ({ ...prev, taxRate: pct }));
    setStep('capex_wc');
    toast({ title: 'Impostos aplicados!', description: `${pct}% de imposto projetado. Agora defina CapEx e Capital de Giro.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, updateAssumptions, toast]);

  // ========== Phase 2: CapEx & Working Capital ==========
  const handleCapexWCContinue = useCallback((fcf: FCFAssumptions) => {
    setFcfAssumptions(fcf);

    // Add to assumptions sheet
    const capexLabel = fcf.capexMethod === 'equals_da' ? 'CapEx = D&A' : fcf.capexMethod === 'percent_of_revenue' ? `CapEx: ${fcf.capexPercentOfRevenue}% da Receita Líquida` : 'CapEx: Manual';
    const wcLabel = fcf.workingCapitalMethod === 'percent_of_revenue' ? `Capital de Giro: ${fcf.wcPercentOfRevenue}% da Receita Líquida` : fcf.workingCapitalMethod === 'days' ? `Capital de Giro: DSO=${fcf.wcDSO} DIO=${fcf.wcDIO} DPO=${fcf.wcDPO}` : 'Capital de Giro: Manual';

    let entries = [...assumptionEntries];
    entries = entries.filter(e => !e.label.startsWith('CapEx') && !e.label.startsWith('Capital de Giro'));
    entries.push({ category: 'Fluxo de Caixa', label: capexLabel, value: fcf.capexMethod === 'percent_of_revenue' ? fcf.capexPercentOfRevenue : 0, unit: fcf.capexMethod === 'equals_da' ? '= D&A' : '% RL' });
    entries.push({ category: 'Fluxo de Caixa', label: wcLabel, value: fcf.workingCapitalMethod === 'percent_of_revenue' ? fcf.wcPercentOfRevenue : 0, unit: fcf.workingCapitalMethod === 'percent_of_revenue' ? '% RL' : 'dias' });
    setAssumptionEntries(entries);
    setAssumptionsSheetData(buildAssumptionsSheet(entries));

    setStep('wacc');
    toast({ title: 'CapEx e Capital de Giro configurados!', description: 'Agora defina o custo de capital (WACC).' });
  }, [assumptionEntries, toast]);

  // ========== Phase 3: WACC ==========
  const handleWACCContinue = useCallback((params: WACCParameters) => {
    setWaccParams(params);
    const result = calculateWACC(params);
    setWaccResult(result);

    // Add WACC to assumptions
    let entries = [...assumptionEntries];
    entries = entries.filter(e => e.category !== 'WACC');
    entries.push({ category: 'WACC', label: 'Custo do Equity (Ke)', value: parseFloat(result.costOfEquity.toFixed(2)), unit: '%' });
    entries.push({ category: 'WACC', label: 'Custo da Dívida pós-IR', value: parseFloat(result.costOfDebtAfterTax.toFixed(2)), unit: '%' });
    entries.push({ category: 'WACC', label: 'WACC', value: parseFloat(result.wacc.toFixed(2)), unit: '%' });
    setAssumptionEntries(entries);
    setAssumptionsSheetData(buildAssumptionsSheet(entries));

    setStep('terminal_value');
    toast({ title: `WACC calculado: ${result.wacc.toFixed(2)}%`, description: `Ke=${result.costOfEquity.toFixed(1)}%, Kd(at)=${result.costOfDebtAfterTax.toFixed(1)}%` });
  }, [assumptionEntries, toast]);

  // ========== Phase 4a: Terminal Value ==========
  const handleTerminalValueContinue = useCallback((params: TerminalValueParameters) => {
    setTvParams(params);

    let entries = [...assumptionEntries];
    entries = entries.filter(e => e.category !== 'Valor Terminal');
    if (params.method === 'gordon_growth' || params.method === 'both') {
      entries.push({ category: 'Valor Terminal', label: 'Taxa de Crescimento Perpétuo', value: params.perpetuityGrowthRate, unit: '%' });
    }
    if (params.method === 'exit_multiple' || params.method === 'both') {
      entries.push({ category: 'Valor Terminal', label: 'Múltiplo de Saída (EV/EBITDA)', value: params.exitMultiple, unit: 'x' });
    }
    setAssumptionEntries(entries);
    setAssumptionsSheetData(buildAssumptionsSheet(entries));

    setStep('equity_bridge');
    toast({ title: 'Valor Terminal configurado!', description: 'Agora defina a ponte para o Equity Value.' });
  }, [assumptionEntries, toast]);

  // ========== Phase 4b: Equity Bridge + run full DCF ==========
  const handleEquityBridgeContinue = useCallback((bridge: EquityBridgeParameters) => {
    if (!rightSpreadsheetData || !waccResult) return;

    setEquityBridge(bridge);

    // 1. Extract IS values for each projected column
    const isData: Array<{
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
    }> = [];

    // Find years from years row data or header detection
    for (let c = originalColCount; c < rightSpreadsheetData.colCount; c++) {
      const yearLabel = yearsRowData
        ? yearsRowData.columns.find(col => col.colIndex === c)?.year?.toString() ?? `Y${c - originalColCount + 1}`
        : `Y${c - originalColCount + 1}`;

      const vals = extractISValues(rightSpreadsheetData, c);
      isData.push({ year: yearLabel, colIndex: c, ...vals });
    }

    // 2. Get previous year's net revenue (last historical)
    const prevNetRevenue = originalColCount > 0
      ? extractISValues(rightSpreadsheetData, originalColCount - 1).netRevenue
      : 0;

    // 3. Build FCF projections
    const fcfYears = buildFCFProjections(isData, fcfAssumptions, incomeStatement.taxRate, prevNetRevenue);

    // 4. Run full DCF valuation
    const result = runDCFValuation(fcfYears, waccResult.wacc, tvParams, bridge);

    // 5. Build sensitivity tables
    const sensGrowth = buildWACCvsGrowthSensitivity(fcfYears.map(y => ({ ...y })), waccResult.wacc, tvParams, bridge);
    const sensMultiple = buildWACCvsExitMultipleSensitivity(fcfYears.map(y => ({ ...y })), waccResult.wacc, tvParams, bridge);

    setProjectedYears(fcfYears);
    setValuationResult(result);
    setSensitivityGrowth(sensGrowth);
    setSensitivityMultiple(sensMultiple);

    // Add bridge to assumptions
    let entries = [...assumptionEntries];
    entries = entries.filter(e => e.category !== 'Equity Bridge');
    entries.push({ category: 'Equity Bridge', label: 'Dívida Total', value: bridge.totalDebt, unit: incomeStatement.projectionYears > 0 ? 'BRL' : '' });
    entries.push({ category: 'Equity Bridge', label: 'Caixa e Equivalentes', value: bridge.cashAndEquivalents, unit: 'BRL' });
    if (bridge.sharesOutstanding > 1) {
      entries.push({ category: 'Equity Bridge', label: 'Ações em Circulação', value: bridge.sharesOutstanding, unit: '' });
    }
    setAssumptionEntries(entries);
    setAssumptionsSheetData(buildAssumptionsSheet(entries));

    setStep('results');
    toast({
      title: 'Valuation concluído!',
      description: result.equityValueGordon
        ? `Equity Value (Gordon): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(result.equityValueGordon)}`
        : 'Verifique os resultados no painel.',
    });
  }, [rightSpreadsheetData, originalColCount, waccResult, fcfAssumptions, incomeStatement, tvParams, yearsRowData, assumptionEntries, toast]);

  // ========== Navigation ==========
  const handleStepBack = useCallback(() => {
    setStep(prev => getPreviousStep(prev));
  }, []);

  const getProjectedEBTValue = useCallback(() => {
    if (!rightSpreadsheetData) return null;
    return getProjectedEBT(rightSpreadsheetData, originalColCount);
  }, [rightSpreadsheetData, originalColCount]);

  // ========== Return state + actions ==========
  const state: ValuationEngineState = {
    step,
    leftSpreadsheetData,
    rightSpreadsheetData,
    baseSheetData,
    originalRightData,
    projectedBaseData,
    originalColCount,
    assumptionsSheetData,
    assumptionEntries,
    yearsRowData,
    yearsRowWarning,
    hasAppliedRevenue,
    incomeStatement,
    fcfAssumptions,
    waccParams,
    tvParams,
    equityBridge,
    waccResult,
    projectedYears,
    valuationResult,
    sensitivityGrowth,
    sensitivityMultiple,
  };

  const actions: ValuationEngineActions = {
    setLeftSpreadsheetData,
    handleConfirm,
    handleReject,
    handleModellingContinue,
    handleApplyRevenue,
    handleAssumptionsContinue,
    handleDeductionsContinue,
    handleCOGSContinue,
    handleSGAContinue,
    handleDAContinue,
    handleFinancialResultContinue,
    handleTaxContinue,
    handleCapexWCContinue,
    handleWACCContinue,
    handleTerminalValueContinue,
    handleEquityBridgeContinue,
    handleStepBack,
    getProjectedEBTValue,
  };

  return [state, actions];
}
