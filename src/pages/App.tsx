import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SpreadsheetData, YearsRowData } from '@/types/spreadsheet';
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
import { addProjectionColumns, applyRevenueProjection, applyDeductionsProjection, applyCOGSProjection, applySGAProjection, applyDAProjection, applyFinancialResultProjection, applyTaxProjection, getProjectedNetRevenue, getProjectedEBIT, getProjectedEBT } from '@/utils/projectionUtils';
import { buildAssumptionsSheet, buildAssumptionsRowMap, type AssumptionEntry } from '@/utils/assumptionsSheetBuilder';
import { detectYearsRow } from '@/utils/yearsRowDetector';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Table2, Settings2, ArrowLeft, BarChart3, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type AppStep = 'import' | 'confirm' | 'modelling' | 'assumptions' | 'deductions' | 'cogs' | 'sga' | 'da' | 'financial_result' | 'tax';
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
    setStep('import');
  }, []);

  // Step 4: "Continuar" in modelling → add projection columns + advance to assumptions
  const handleModellingContinue = useCallback((years: number, lastClosedYear: number) => {
    if (!originalRightData) return;

    // Detect years row and classify columns
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

    // Re-detect after projection columns are added
    if (detection.success && detection.data) {
      const updatedDetection = detectYearsRow(projected, lastClosedYear);
      if (updatedDetection.success && updatedDetection.data) {
        setYearsRowData(updatedDetection.data);
      }
    }

    // Initialize the assumptions sheet (empty entries for now)
    const initialSheet = buildAssumptionsSheet([]);
    setAssumptionsSheetData(initialSheet);

    toast({
      title: `${years} ano${years > 1 ? 's' : ''} adicionado${years > 1 ? 's' : ''}!`,
      description: `Projeção a partir de ${lastClosedYear + 1}. Defina as premissas.`,
    });
  }, [originalRightData, toast]);

  // Step 5a: "Projetar Receita" — apply growth rate to revenue row
  const handleApplyRevenue = useCallback((revenueGrowthRate: number) => {
    if (!projectedBaseData) return;

    // Build updated entries first so we can compute the row map
    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Taxa de Crescimento de Receita'),
      {
        category: 'Receita',
        label: 'Taxa de Crescimento de Receita',
        value: revenueGrowthRate,
        unit: '% a.a.',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Taxa de Crescimento de Receita');

    const projected = applyRevenueProjection(projectedBaseData, revenueGrowthRate, originalColCount, premissasRow);
    setRightSpreadsheetData(projected);
    setHasAppliedRevenue(true);

    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    toast({
      title: 'Projeção de receita aplicada!',
      description: `Taxa de crescimento: ${revenueGrowthRate}% ao ano`,
    });
  }, [projectedBaseData, originalColCount, assumptionEntries, toast]);

  // Step 5b: "Continuar" — advance to deductions step
  const handleAssumptionsContinue = useCallback(() => {
    setStep('deductions');
    toast({
      title: 'Projeção de receita confirmada!',
      description: 'Defina as deduções sobre a receita bruta.',
    });
  }, [toast]);

  // Step 6a: Back from deductions to assumptions
  const handleDeductionsBack = useCallback(() => {
    setStep('assumptions');
  }, []);

  // Step 6b: Continue from deductions — apply deductions to grid, advance to COGS
  const handleDeductionsContinue = useCallback((deductionsPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Deduções sobre Receita Bruta'),
      {
        category: 'Deduções',
        label: 'Deduções sobre Receita Bruta',
        value: deductionsPercent,
        unit: '% da Receita Bruta',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Deduções sobre Receita Bruta');

    const updated = applyDeductionsProjection(rightSpreadsheetData, deductionsPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    setStep('cogs');

    toast({
      title: 'Deduções aplicadas!',
      description: `${deductionsPercent}% de deduções projetadas em todas as colunas.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Step 7a: Back from COGS to deductions
  const handleCOGSBack = useCallback(() => {
    setStep('deductions');
  }, []);

  // Step 7b: Continue from COGS — apply COGS to grid
  const handleCOGSContinue = useCallback((cogsPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Custo (CMV) sobre Receita Líquida'),
      {
        category: 'Custos',
        label: 'Custo (CMV) sobre Receita Líquida',
        value: cogsPercent,
        unit: '% da Receita Líquida',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Custo (CMV) sobre Receita Líquida');

    const updated = applyCOGSProjection(rightSpreadsheetData, cogsPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    setStep('sga');

    toast({
      title: 'Custos aplicados!',
      description: `${cogsPercent}% de CMV projetado sobre a receita líquida.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Step 8a: Back from SGA to COGS
  const handleSGABack = useCallback(() => {
    setStep('cogs');
  }, []);

  // Step 8b: Continue from SGA — apply SGA to grid, advance to D&A
  const handleSGAContinue = useCallback((sgaPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Despesas (SG&A) sobre Lucro Bruto'),
      {
        category: 'Despesas',
        label: 'Despesas (SG&A) sobre Lucro Bruto',
        value: sgaPercent,
        unit: '% do Lucro Bruto',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Despesas (SG&A) sobre Lucro Bruto');

    const updated = applySGAProjection(rightSpreadsheetData, sgaPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    setStep('da');

    toast({
      title: 'Despesas aplicadas!',
      description: `${sgaPercent}% de SG&A projetado sobre o lucro bruto.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Step 9a: Back from D&A to SGA
  const handleDABack = useCallback(() => {
    setStep('sga');
  }, []);

  // Step 9b: Continue from D&A — apply D&A to grid, advance to financial result
  const handleDAContinue = useCallback((daPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'D&A sobre Receita Líquida'),
      {
        category: 'D&A',
        label: 'D&A sobre Receita Líquida',
        value: daPercent,
        unit: '% da Receita Líquida',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('D&A sobre Receita Líquida');

    const updated = applyDAProjection(rightSpreadsheetData, daPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    setStep('financial_result');

    toast({
      title: 'D&A aplicada!',
      description: `${daPercent}% de D&A projetado sobre a receita líquida.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Step 10a: Back from Financial Result to D&A
  const handleFinancialResultBack = useCallback(() => {
    setStep('da');
  }, []);

  // Step 10b: Continue from Financial Result — apply to grid, advance to tax
  const handleFinancialResultContinue = useCallback((financialResultPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Resultado Financeiro sobre Receita Líquida'),
      {
        category: 'Resultado Financeiro',
        label: 'Resultado Financeiro sobre Receita Líquida',
        value: financialResultPercent,
        unit: '% da Receita Líquida',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Resultado Financeiro sobre Receita Líquida');

    const updated = applyFinancialResultProjection(rightSpreadsheetData, financialResultPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    setStep('tax');

    toast({
      title: 'Resultado Financeiro aplicado!',
      description: `${financialResultPercent}% de resultado financeiro projetado sobre a receita líquida.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Step 11a: Back from Tax to Financial Result
  const handleTaxBack = useCallback(() => {
    setStep('financial_result');
  }, []);

  // Step 11b: Continue from Tax — apply tax to grid
  const handleTaxContinue = useCallback((taxPercent: number) => {
    if (!rightSpreadsheetData) return;

    const newEntries: AssumptionEntry[] = [
      ...assumptionEntries.filter(e => e.label !== 'Impostos sobre EBT'),
      {
        category: 'Impostos',
        label: 'Impostos sobre EBT',
        value: taxPercent,
        unit: '% do EBT',
      },
    ];
    const rowMap = buildAssumptionsRowMap(newEntries);
    const premissasRow = rowMap.get('Impostos sobre EBT');

    const updated = applyTaxProjection(rightSpreadsheetData, taxPercent, originalColCount, premissasRow);
    setRightSpreadsheetData(updated);
    setAssumptionEntries(newEntries);
    setAssumptionsSheetData(buildAssumptionsSheet(newEntries));

    toast({
      title: 'Impostos aplicados!',
      description: `${taxPercent}% de imposto projetado sobre o EBT.`,
    });
  }, [rightSpreadsheetData, originalColCount, assumptionEntries, toast]);

  // Left panel tab label & icon based on current step
  const getLeftTabConfig = () => {
    switch (step) {
      case 'modelling':
        return { label: 'Modelagem Financeira', Icon: TrendingUp };
      case 'assumptions':
        return { label: 'Premissas de Projeção', Icon: BarChart3 };
      case 'deductions':
        return { label: 'Deduções de Receita', Icon: BarChart3 };
      case 'cogs':
        return { label: 'Custo (CMV)', Icon: BarChart3 };
      case 'sga':
        return { label: 'Despesas (SG&A)', Icon: BarChart3 };
      case 'da':
        return { label: 'D&A', Icon: BarChart3 };
      case 'financial_result':
        return { label: 'Resultado Financeiro', Icon: BarChart3 };
      case 'tax':
        return { label: 'Impostos / Tax', Icon: BarChart3 };
      default:
        return { label: 'Dados Importados', Icon: Table2 };
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

    // Sheet 1: Base (original data)
    if (baseSheetData) {
      const wsBase = wb.addWorksheet('Base');
      writeSheetFromSpreadsheetData(wsBase, baseSheetData);
    }

    // Sheet 2: Financials (projection working space)
    const wsFinancials = wb.addWorksheet('Financials');
    writeSheetFromSpreadsheetData(wsFinancials, rightSpreadsheetData);

    // Sheet 3: Premissas (assumptions)
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
        return (
          <RevenueDeductions
            onBack={handleDeductionsBack}
            onContinue={handleDeductionsContinue}
          />
        );
      case 'cogs':
        return (
          <COGSInput
            onBack={handleCOGSBack}
            onContinue={handleCOGSContinue}
          />
        );
      case 'sga':
        return (
          <SGAInput
            onBack={handleSGABack}
            onContinue={handleSGAContinue}
          />
        );
      case 'da':
        return (
          <DAInput
            onBack={handleDABack}
            onContinue={handleDAContinue}
          />
        );
      case 'financial_result':
        return (
          <FinancialResultInput
            onBack={handleFinancialResultBack}
            onContinue={handleFinancialResultContinue}
          />
        );
      case 'tax':
        return (
          <TaxInput
            ebt={getProjectedEBT(rightSpreadsheetData!, originalColCount)}
            onBack={handleTaxBack}
            onContinue={handleTaxContinue}
          />
        );
      default:
        return (
          <ExcelUpload
            data={leftSpreadsheetData}
            onDataLoaded={setLeftSpreadsheetData}
          />
        );
    }
  };

  // Footer status text
  const getFooterText = () => {
    switch (step) {
      case 'modelling':
        return 'Dados confirmados — Defina o número de anos';
      case 'assumptions':
        return 'Colunas projetadas — Defina as premissas';
      case 'deductions':
        return 'Receita projetada — Defina as deduções';
      case 'cogs':
        return 'Deduções aplicadas — Defina o custo (CMV)';
      case 'sga':
        return 'Custos aplicados — Defina as despesas (SG&A)';
      case 'da':
        return 'Despesas aplicadas — Defina a D&A';
      case 'financial_result':
        return 'D&A aplicada — Defina o Resultado Financeiro';
      case 'tax':
        return 'Resultado Financeiro aplicado — Defina os Impostos';
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
