import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SpreadsheetData, YearsRowData } from '@/types/spreadsheet';
import type { FCFAssumptions, WACCParameters, TerminalValueParameters, EquityBridgeParameters, ProjectedYear, ValuationResult, WACCResult, SensitivityMatrix } from '@/engine/types';
import { VirtualizedSpreadsheet } from '@/components/VirtualizedSpreadsheet';
import { ExcelUpload } from '@/components/ExcelUpload';
import { ConfirmationBanner } from '@/components/ConfirmationBanner';
import { FinancialModellingPanel } from '@/components/FinancialModellingPanel';
import { ProjectionAssumptions } from '@/components/ProjectionAssumptions';
import { RevenueDeductions } from '@/components/RevenueDeductions';
import { COGSInput } from '@/components/COGSInput';
import { SGAInput } from '@/components/SGAInput';
import { DAInput } from '@/components/DAInput';
import { FinancialResultInput } from '@/components/FinancialResultInput';
import { TaxInput } from '@/components/TaxInput';
import { CapexWCInput } from '@/components/CapexWCInput';
import { WACCInput } from '@/components/WACCInput';
import { TerminalValueInput } from '@/components/TerminalValueInput';
import { EquityBridgeInput } from '@/components/EquityBridgeInput';
import { ValuationResultsPanel } from '@/components/ValuationResultsPanel';
import { addProjectionColumns, applyRevenueProjection, applyDeductionsProjection, applyCOGSProjection, applySGAProjection, applyDAProjection, applyFinancialResultProjection, applyTaxProjection, getProjectedNetRevenue, getProjectedEBIT, getProjectedEBT } from '@/utils/projectionUtils';
import { buildAssumptionsSheet, buildAssumptionsRowMap, type AssumptionEntry } from '@/utils/assumptionsSheetBuilder';
import { detectYearsRow, detectLastYearFromData } from '@/utils/yearsRowDetector';
import { calculateWACC } from '@/engine/wacc';
import { buildFCFProjections } from '@/engine/fcf';
import { runDCFValuation } from '@/engine/dcf';
import { buildWACCvsGrowthSensitivity } from '@/engine/sensitivity';
import {
  findRevenueRow, findDeductionsRow, findNetRevenueRow, findCOGSRow,
  findGrossProfitRow, findSGARow, findEBITDARow, findDARow, findEBITRow,
  findFinancialResultRow, findEBTRow, findTaxRow, findNetIncomeRow,
} from '@/utils/projectionUtils';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft, BarChart3, FileSpreadsheet, Download, Factory, Percent, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type AppStep = 'import' | 'confirm' | 'modelling' | 'assumptions' | 'deductions' | 'cogs' | 'sga' | 'da' | 'financial_result' | 'tax' | 'capex_wc' | 'wacc' | 'terminal_value' | 'equity_bridge' | 'results';
type RightTab = 'base' | 'financials' | 'assumptions';

const Index = () => {
  const [leftSpreadsheetData, setLeftSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [rightSpreadsheetData, setRightSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [baseSheetData, setBaseSheetData] = useState<SpreadsheetData | null>(null);
  const [originalRightData, setOriginalRightData] = useState<SpreadsheetData | null>(null);
  const [projectedBaseData, setProjectedBaseData] = useState<SpreadsheetData | null>(null);
  const [originalColCount, setOriginalColCount] = useState<number>(0);
  const [hasAppliedRevenue, setHasAppliedRevenue] = useState(false);
  const [step, setStep] = useState<AppStep>('import');
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('financials');
  const [assumptionsSheetData, setAssumptionsSheetData] = useState<SpreadsheetData | null>(null);
  const [assumptionEntries, setAssumptionEntries] = useState<AssumptionEntry[]>([]);
  const [yearsRowData, setYearsRowData] = useState<YearsRowData | null>(null);
  const [yearsRowWarning, setYearsRowWarning] = useState<string | null>(null);

  // Valuation state
  const [fcfAssumptions, setFcfAssumptions] = useState<FCFAssumptions | null>(null);
  const [waccParams, setWaccParams] = useState<WACCParameters | null>(null);
  const [waccResult, setWaccResult] = useState<WACCResult | null>(null);
  const [tvParams, setTvParams] = useState<TerminalValueParameters | null>(null);
  const [equityBridgeParams, setEquityBridgeParams] = useState<EquityBridgeParameters | null>(null);
  const [projectedYears, setProjectedYears] = useState<ProjectedYear[]>([]);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const [sensitivityGrowth, setSensitivityGrowth] = useState<SensitivityMatrix | null>(null);
  const [taxRateForValuation, setTaxRateForValuation] = useState(34);

  const { toast } = useToast();

  // Auto-copy left data to right whenever left changes during import step
  useEffect(() => {
    if (step !== 'import') return;

    if (leftSpreadsheetData) {
      const deepCopy = (src: SpreadsheetData): SpreadsheetData => ({
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
      });
      const copiedData = deepCopy(leftSpreadsheetData);
      setBaseSheetData(deepCopy(leftSpreadsheetData));
      setRightSpreadsheetData(copiedData);
      setOriginalRightData(copiedData);
      setOriginalColCount(copiedData.colCount);
      setStep('confirm');
    } else {
      setRightSpreadsheetData(null);
      setBaseSheetData(null);
    }
  }, [leftSpreadsheetData]);

  const handleConfirm = useCallback(() => {
    setStep('modelling');
    toast({
      title: 'Dados confirmados!',
      description: 'Configure a modelagem financeira no painel esquerdo.',
    });
  }, [toast]);

  const handleReject = useCallback(() => {
    setLeftSpreadsheetData(null);
    setRightSpreadsheetData(null);
    setBaseSheetData(null);
    setOriginalRightData(null);
    setProjectedBaseData(null);
    setOriginalColCount(0);
    setHasAppliedRevenue(false);
    setActiveRightTab('financials');
    setAssumptionsSheetData(null);
    setAssumptionEntries([]);
    setYearsRowData(null);
    setYearsRowWarning(null);
    setFcfAssumptions(null);
    setWaccParams(null);
    setWaccResult(null);
    setTvParams(null);
    setEquityBridgeParams(null);
    setProjectedYears([]);
    setValuationResult(null);
    setSensitivityGrowth(null);
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
    setRightSpreadsheetData(projected);
    setProjectedBaseData(projected);
    setStep('assumptions');

    if (detection.success) {
      const updatedDetection = detectYearsRow(projected, lastClosedYear);
      if (updatedDetection.success && updatedDetection.data) {
        setYearsRowData(updatedDetection.data);
      }
    }

    const initialSheet = buildAssumptionsSheet([]);
    setAssumptionsSheetData(initialSheet);

    toast({
      title: `${years} ano${years > 1 ? 's' : ''} adicionado${years > 1 ? 's' : ''}!`,
      description: `Projeção a partir de ${lastClosedYear + 1}. Defina as premissas.`,
    });
  }, [originalRightData, toast]);

  const handleApplyRevenue = useCallback((revenueGrowthRate: number) => {
    if (!projectedBaseData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Taxa de Crescimento de Receita'),
      { category: 'Receita', label: 'Taxa de Crescimento de Receita', value: revenueGrowthRate, unit: '% a.a.' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Taxa de Crescimento de Receita');

    const projected = applyRevenueProjection(projectedBaseData, revenueGrowthRate, originalColCount, premissasRow);
    setRightSpreadsheetData(projected);
    setHasAppliedRevenue(true);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    toast({ title: 'Projeção de receita aplicada!', description: `Taxa de crescimento: ${revenueGrowthRate}% ao ano` });
  }, [projectedBaseData, originalColCount, assumptionEntries, toast]);

  const handleAssumptionsContinue = useCallback(() => {
    setStep('deductions');
    toast({ title: 'Projeção de receita confirmada!', description: 'Defina as deduções sobre a receita bruta.' });
  }, [toast]);

  const handleDeductionsBack = useCallback(() => { setStep('assumptions'); }, []);

  const handleDeductionsContinue = useCallback((deductionsPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Deduções sobre Receita Bruta'),
      { category: 'Deduções', label: 'Deduções sobre Receita Bruta', value: deductionsPercent, unit: '% da Receita Bruta' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Deduções sobre Receita Bruta');
    const updated = applyDeductionsProjection(rightSpreadsheetData, deductionsPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setStep('cogs');
    toast({ title: 'Deduções aplicadas!', description: `${deductionsPercent}% de deduções projetadas.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  const handleCOGSBack = useCallback(() => { setStep('deductions'); }, []);

  const handleCOGSContinue = useCallback((cogsPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Custo (CMV) sobre Receita Líquida'),
      { category: 'Custos', label: 'Custo (CMV) sobre Receita Líquida', value: cogsPercent, unit: '% da Receita Líquida' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Custo (CMV) sobre Receita Líquida');
    const updated = applyCOGSProjection(rightSpreadsheetData, cogsPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setStep('sga');
    toast({ title: 'Custos aplicados!', description: `${cogsPercent}% de CMV projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  const handleSGABack = useCallback(() => { setStep('cogs'); }, []);

  const handleSGAContinue = useCallback((sgaPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Despesas (SG&A) sobre Lucro Bruto'),
      { category: 'Despesas', label: 'Despesas (SG&A) sobre Lucro Bruto', value: sgaPercent, unit: '% do Lucro Bruto' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Despesas (SG&A) sobre Lucro Bruto');
    const updated = applySGAProjection(rightSpreadsheetData, sgaPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setStep('da');
    toast({ title: 'Despesas aplicadas!', description: `${sgaPercent}% de SG&A projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  const handleDABack = useCallback(() => { setStep('sga'); }, []);

  const handleDAContinue = useCallback((daPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'D&A sobre Receita Líquida'),
      { category: 'D&A', label: 'D&A sobre Receita Líquida', value: daPercent, unit: '% da Receita Líquida' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('D&A sobre Receita Líquida');
    const updated = applyDAProjection(rightSpreadsheetData, daPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setStep('financial_result');
    toast({ title: 'D&A aplicada!', description: `${daPercent}% de D&A projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  const handleFinancialResultBack = useCallback(() => { setStep('da'); }, []);

  const handleFinancialResultContinue = useCallback((financialResultPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Resultado Financeiro sobre Receita Líquida'),
      { category: 'Resultado Financeiro', label: 'Resultado Financeiro sobre Receita Líquida', value: financialResultPercent, unit: '% da Receita Líquida' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Resultado Financeiro sobre Receita Líquida');
    const updated = applyFinancialResultProjection(rightSpreadsheetData, financialResultPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setStep('tax');
    toast({ title: 'Resultado Financeiro aplicado!', description: `${financialResultPercent}% projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  const handleTaxBack = useCallback(() => { setStep('financial_result'); }, []);

  const handleTaxContinue = useCallback((taxPercent: number) => {
    if (!rightSpreadsheetData) return;
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Impostos sobre EBT'),
      { category: 'Impostos', label: 'Impostos sobre EBT', value: taxPercent, unit: '% do EBT' },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Impostos sobre EBT');
    const updated = applyTaxProjection(rightSpreadsheetData, taxPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));
    setTaxRateForValuation(taxPercent);
    setStep('capex_wc');
    toast({ title: 'Impostos aplicados!', description: `${taxPercent}% de imposto projetado.` });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // ==================== New DCF Steps ====================

  const handleCapexWCBack = useCallback(() => { setStep('tax'); }, []);

  const handleCapexWCContinue = useCallback((assumptions: FCFAssumptions) => {
    setFcfAssumptions(assumptions);
    setStep('wacc');
    toast({ title: 'CapEx & Capital de Giro definidos!', description: 'Defina o WACC.' });
  }, [toast]);

  const handleWACCBack = useCallback(() => { setStep('capex_wc'); }, []);

  const handleWACCContinue = useCallback((params: WACCParameters) => {
    setWaccParams(params);
    const result = calculateWACC(params);
    setWaccResult(result);
    setStep('terminal_value');
    toast({ title: `WACC: ${result.wacc.toFixed(2)}%`, description: 'Defina o Valor Terminal.' });
  }, [toast]);

  const handleTerminalValueBack = useCallback(() => { setStep('wacc'); }, []);

  const handleTerminalValueContinue = useCallback((params: TerminalValueParameters) => {
    setTvParams(params);
    setStep('equity_bridge');
    toast({ title: 'Valor Terminal definido!', description: 'Defina o Equity Bridge.' });
  }, [toast]);

  const handleEquityBridgeBack = useCallback(() => { setStep('terminal_value'); }, []);

  const handleEquityBridgeContinue = useCallback((params: EquityBridgeParameters) => {
    if (!rightSpreadsheetData || !fcfAssumptions || !waccResult || !tvParams) return;

    setEquityBridgeParams(params);

    // Extract income statement row indices
    const rowFinders = {
      grossRevenue: findRevenueRow(rightSpreadsheetData),
      deductions: findDeductionsRow(rightSpreadsheetData),
      netRevenue: findNetRevenueRow(rightSpreadsheetData),
      cogs: findCOGSRow(rightSpreadsheetData),
      grossProfit: findGrossProfitRow(rightSpreadsheetData),
      sga: findSGARow(rightSpreadsheetData),
      ebitda: findEBITDARow(rightSpreadsheetData),
      da: findDARow(rightSpreadsheetData),
      ebit: findEBITRow(rightSpreadsheetData),
      financialResult: findFinancialResultRow(rightSpreadsheetData),
      ebt: findEBTRow(rightSpreadsheetData),
      tax: findTaxRow(rightSpreadsheetData),
      netIncome: findNetIncomeRow(rightSpreadsheetData),
    };

    const getVal = (row: number | null, col: number) => {
      if (row === null) return 0;
      const v = rightSpreadsheetData.values[row]?.[col];
      if (v == null) return 0;
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    };

    // Build income statement data for each projected column
    const incomeData = [];
    for (let c = originalColCount; c < rightSpreadsheetData.colCount; c++) {
      const yearLabel = rightSpreadsheetData.values[0]?.[c];
      incomeData.push({
        year: String(yearLabel ?? (c - originalColCount + 1)),
        colIndex: c,
        grossRevenue: getVal(rowFinders.grossRevenue, c),
        deductions: getVal(rowFinders.deductions, c),
        netRevenue: getVal(rowFinders.netRevenue, c),
        cogs: getVal(rowFinders.cogs, c),
        grossProfit: getVal(rowFinders.grossProfit, c),
        sga: getVal(rowFinders.sga, c),
        ebitda: getVal(rowFinders.ebitda, c),
        da: getVal(rowFinders.da, c),
        ebit: getVal(rowFinders.ebit, c),
        financialResult: getVal(rowFinders.financialResult, c),
        ebt: getVal(rowFinders.ebt, c),
        tax: getVal(rowFinders.tax, c),
        netIncome: getVal(rowFinders.netIncome, c),
      });
    }

    // Get last historical net revenue for ΔWC calculation
    const lastHistNetRev = originalColCount > 0 ? getVal(rowFinders.netRevenue, originalColCount - 1) : 0;

    // Build FCF projections
    const years = buildFCFProjections(incomeData, fcfAssumptions, taxRateForValuation, lastHistNetRev);

    // Run DCF valuation (applies discounting + terminal value + equity bridge)
    const result = runDCFValuation(years, waccResult.wacc, tvParams, params);

    setProjectedYears(years);
    setValuationResult(result);

    // Sensitivity
    if (tvParams.method === 'gordon_growth' || tvParams.method === 'both') {
      const sens = buildWACCvsGrowthSensitivity(years, waccResult.wacc, tvParams, params);
      setSensitivityGrowth(sens);
    }

    setStep('results');
    toast({ title: 'Valuation calculado!', description: 'Veja os resultados.' });
  }, [rightSpreadsheetData, originalColCount, fcfAssumptions, waccResult, tvParams, taxRateForValuation, toast]);

  const handleResultsBack = useCallback(() => { setStep('equity_bridge'); }, []);

  // Left panel tab label & icon based on current step
  const getLeftTabConfig = () => {
    switch (step) {
      case 'modelling': return { label: 'Modelagem Financeira', Icon: TrendingUp };
      case 'assumptions': return { label: 'Premissas de Projeção', Icon: BarChart3 };
      case 'deductions': return { label: 'Deduções de Receita', Icon: BarChart3 };
      case 'cogs': return { label: 'Custo (CMV)', Icon: BarChart3 };
      case 'sga': return { label: 'Despesas (SG&A)', Icon: BarChart3 };
      case 'da': return { label: 'D&A', Icon: BarChart3 };
      case 'financial_result': return { label: 'Resultado Financeiro', Icon: BarChart3 };
      case 'tax': return { label: 'Impostos / Tax', Icon: BarChart3 };
      case 'capex_wc': return { label: 'CapEx & Capital de Giro', Icon: Factory };
      case 'wacc': return { label: 'WACC', Icon: Percent };
      case 'terminal_value': return { label: 'Valor Terminal', Icon: TrendingUp };
      case 'equity_bridge': return { label: 'Equity Bridge', Icon: BarChart3 };
      case 'results': return { label: 'Resultado do Valuation', Icon: Trophy };
      default: return { label: 'Dados Importados', Icon: Table2 };
    }
  };

  const { label: leftTabLabel, Icon: LeftTabIcon } = getLeftTabConfig();

  const writeSheetFromSpreadsheetData = (ws: ExcelJS.Worksheet, data: SpreadsheetData) => {
    const { values, formats, formulas, columnWidths } = data;
    values.forEach((row, ri) => {
      const excelRow = ws.addRow(row.map(v => v ?? ''));
      row.forEach((_, ci) => {
        const cell = excelRow.getCell(ci + 1);
        const formula = formulas?.[ri]?.[ci];
        if (formula) {
          cell.value = { formula: formula.startsWith('=') ? formula.slice(1) : formula } as any;
        }
        const fmt = formats?.[ri]?.[ci];
        if (!fmt) return;
        if (fmt.bold || fmt.italic || fmt.underline || fmt.textColor || fmt.fontSize) {
          cell.font = {
            bold: fmt.bold,
            italic: fmt.italic,
            underline: fmt.underline ? 'single' : undefined,
            color: fmt.textColor ? { argb: fmt.textColor.replace('#', 'FF') } : undefined,
            size: fmt.fontSize,
          };
        }
        if (fmt.bgColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fmt.bgColor.replace('#', 'FF') } };
        }
        if (fmt.horizontalAlignment) {
          cell.alignment = { horizontal: fmt.horizontalAlignment as any, vertical: fmt.verticalAlignment as any, wrapText: fmt.wrapText };
        }
        if (fmt.numberFormat) {
          cell.numFmt = fmt.numberFormat;
        }
      });
    });
    if (columnWidths) {
      columnWidths.forEach((w, i) => {
        ws.getColumn(i + 1).width = Math.max(w / 7, 8);
      });
    }
  };

  const handleDownloadExcel = useCallback(async () => {
    if (!rightSpreadsheetData) return;
    const wb = new ExcelJS.Workbook();

    if (baseSheetData) {
      const wsBase = wb.addWorksheet('Base');
      writeSheetFromSpreadsheetData(wsBase, baseSheetData);
    }

    const wsFinancials = wb.addWorksheet('Financials');
    writeSheetFromSpreadsheetData(wsFinancials, rightSpreadsheetData);

    if (assumptionsSheetData) {
      const wsPremissas = wb.addWorksheet('Premissas');
      writeSheetFromSpreadsheetData(wsPremissas, assumptionsSheetData);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Constance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [rightSpreadsheetData, baseSheetData, assumptionsSheetData]);

  // Render left panel content based on step
  const renderLeftPanel = () => {
    switch (step) {
      case 'modelling':
        return <FinancialModellingPanel onContinue={handleModellingContinue} yearsRowWarning={yearsRowWarning} />;
      case 'assumptions':
        return <ProjectionAssumptions onApply={handleApplyRevenue} onContinue={handleAssumptionsContinue} hasApplied={hasAppliedRevenue} />;
      case 'deductions':
        return <RevenueDeductions onBack={handleDeductionsBack} onContinue={handleDeductionsContinue} />;
      case 'cogs':
        return <COGSInput onBack={handleCOGSBack} onContinue={handleCOGSContinue} />;
      case 'sga':
        return <SGAInput onBack={handleSGABack} onContinue={handleSGAContinue} />;
      case 'da':
        return <DAInput onBack={handleDABack} onContinue={handleDAContinue} />;
      case 'financial_result':
        return <FinancialResultInput onBack={handleFinancialResultBack} onContinue={handleFinancialResultContinue} />;
      case 'tax':
        return <TaxInput ebt={getProjectedEBT(rightSpreadsheetData!, originalColCount)} onBack={handleTaxBack} onContinue={handleTaxContinue} />;
      case 'capex_wc':
        return <CapexWCInput onBack={handleCapexWCBack} onContinue={handleCapexWCContinue} />;
      case 'wacc':
        return <WACCInput initialParams={waccParams ?? undefined} onBack={handleWACCBack} onContinue={handleWACCContinue} />;
      case 'terminal_value':
        return <TerminalValueInput initialParams={tvParams ?? undefined} onBack={handleTerminalValueBack} onContinue={handleTerminalValueContinue} />;
      case 'equity_bridge':
        return <EquityBridgeInput initialParams={equityBridgeParams ?? undefined} onBack={handleEquityBridgeBack} onContinue={handleEquityBridgeContinue} />;
      case 'results':
        return valuationResult && waccResult ? (
          <ValuationResultsPanel
            valuationResult={valuationResult}
            waccResult={waccResult}
            projectedYears={projectedYears}
            sensitivityGrowth={sensitivityGrowth}
            sensitivityMultiple={null}
            currency="BRL"
            onBack={handleResultsBack}
          />
        ) : null;
      default:
        return <ExcelUpload data={leftSpreadsheetData} onDataLoaded={setLeftSpreadsheetData} />;
    }
  };

  // Footer status text
  const getFooterText = () => {
    switch (step) {
      case 'modelling': return 'Dados confirmados — Defina o número de anos';
      case 'assumptions': return 'Colunas projetadas — Defina as premissas';
      case 'deductions': return 'Receita projetada — Defina as deduções';
      case 'cogs': return 'Deduções aplicadas — Defina o custo (CMV)';
      case 'sga': return 'Custos aplicados — Defina as despesas (SG&A)';
      case 'da': return 'Despesas aplicadas — Defina a D&A';
      case 'financial_result': return 'D&A aplicada — Defina o Resultado Financeiro';
      case 'tax': return 'Resultado Financeiro aplicado — Defina os Impostos';
      case 'capex_wc': return 'DRE projetada — Defina CapEx & Capital de Giro';
      case 'wacc': return 'FCF configurado — Defina o WACC';
      case 'terminal_value': return 'WACC definido — Defina o Valor Terminal';
      case 'equity_bridge': return 'Valor Terminal definido — Defina o Equity Bridge';
      case 'results': return 'Valuation concluído';
      default:
        return leftSpreadsheetData
          ? `Importado: ${leftSpreadsheetData.rowCount} linhas × ${leftSpreadsheetData.colCount} colunas — Espelhado automaticamente`
          : 'Aguardando importação de dados...';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-muted/50 flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Constance</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link to="/">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Voltar
          </Link>
        </Button>
      </header>

      {/* Main spreadsheet area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[40%] border-r border-border flex flex-col">
          {/* Sheet tab */}
          <div className="flex items-center bg-muted/30 border-b border-border">
           <div className="px-3 py-1.5 text-xs font-medium bg-background border-r border-border flex items-center gap-1.5">
              <LeftTabIcon className="w-3.5 h-3.5 text-primary" />
              {leftTabLabel}
            </div>
            {rightSpreadsheetData && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto mr-1 h-6 text-xs gap-1 px-2"
                onClick={handleDownloadExcel}
              >
                <Download className="w-3 h-3" />
                Excel
              </Button>
            )}
          </div>

          {/* Left panel content */}
          <div className="flex-1 overflow-hidden">
            {renderLeftPanel()}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[60%] flex flex-col">
          {/* Sheet tabs */}
          <div className="flex items-center bg-muted/30 border-b border-border">
            {baseSheetData && (
              <button
                onClick={() => setActiveRightTab('base')}
                className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                  activeRightTab === 'base'
                    ? 'bg-background text-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Table2 className="w-3.5 h-3.5 text-muted-foreground" />
                Base
              </button>
            )}
            <button
              onClick={() => setActiveRightTab('financials')}
              className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                activeRightTab === 'financials'
                  ? 'bg-background text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-accent" />
              Financials
            </button>
            {assumptionsSheetData && (
              <button
                onClick={() => setActiveRightTab('assumptions')}
                className={`px-3 py-1.5 text-xs font-medium border-r border-border flex items-center gap-1.5 transition-colors ${
                  activeRightTab === 'assumptions'
                    ? 'bg-background text-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                Premissas
              </button>
            )}
            {activeRightTab === 'financials' && rightSpreadsheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {rightSpreadsheetData.rowCount} linhas × {rightSpreadsheetData.colCount} colunas
              </span>
            )}
            {activeRightTab === 'base' && baseSheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {baseSheetData.rowCount} linhas × {baseSheetData.colCount} colunas
              </span>
            )}
            {activeRightTab === 'assumptions' && assumptionsSheetData && (
              <span className="text-xs text-muted-foreground ml-2">
                {assumptionEntries.length} premissa{assumptionEntries.length !== 1 ? 's' : ''} configurada{assumptionEntries.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Spreadsheet content */}
          <div className="flex-1 overflow-hidden border-t border-border relative">
            {step === 'confirm' && activeRightTab === 'financials' && (
              <ConfirmationBanner onConfirm={handleConfirm} onReject={handleReject} />
            )}
            {activeRightTab === 'financials' ? (
              rightSpreadsheetData ? (
                <VirtualizedSpreadsheet
                  data={rightSpreadsheetData}
                  totalRows={1000}
                  totalColumns={100}
                  yearsRow={yearsRowData}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Cole seus dados do Excel no painel esquerdo
                  </p>
                </div>
              )
            ) : activeRightTab === 'base' ? (
              baseSheetData && (
                <VirtualizedSpreadsheet
                  data={baseSheetData}
                  totalRows={1000}
                  totalColumns={100}
                />
              )
            ) : (
              assumptionsSheetData && (
                <VirtualizedSpreadsheet
                  data={assumptionsSheetData}
                  totalRows={assumptionsSheetData.rowCount}
                  totalColumns={assumptionsSheetData.colCount}
                />
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 px-3 py-1 flex items-center text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded mr-2">fx</span>
        <span>{getFooterText()}</span>
      </footer>
    </div>
  );
};

export default Index;
