import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { SpreadsheetData } from '@/types/spreadsheet';
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
import { useValuationEngine } from '@/hooks/useValuationEngine';
import { TrendingUp, Table2, Settings2, ArrowLeft, BarChart3, FileSpreadsheet, Download, Factory, Percent, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type RightTab = 'base' | 'financials' | 'assumptions';

const Index = () => {
  const [state, actions] = useValuationEngine();
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('financials');

  const {
    step, leftSpreadsheetData, rightSpreadsheetData, baseSheetData,
    originalColCount, assumptionsSheetData, assumptionEntries,
    yearsRowData, yearsRowWarning, hasAppliedRevenue,
    waccParams, tvParams, equityBridge,
    waccResult, projectedYears, valuationResult,
    sensitivityGrowth, sensitivityMultiple,
  } = state;

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
        return <FinancialModellingPanel onContinue={actions.handleModellingContinue} yearsRowWarning={yearsRowWarning} />;
      case 'assumptions':
        return <ProjectionAssumptions onApply={actions.handleApplyRevenue} onContinue={actions.handleAssumptionsContinue} hasApplied={hasAppliedRevenue} />;
      case 'deductions':
        return <RevenueDeductions onBack={actions.handleStepBack} onContinue={actions.handleDeductionsContinue} />;
      case 'cogs':
        return <COGSInput onBack={actions.handleStepBack} onContinue={actions.handleCOGSContinue} />;
      case 'sga':
        return <SGAInput onBack={actions.handleStepBack} onContinue={actions.handleSGAContinue} />;
      case 'da':
        return <DAInput onBack={actions.handleStepBack} onContinue={actions.handleDAContinue} />;
      case 'financial_result':
        return <FinancialResultInput onBack={actions.handleStepBack} onContinue={actions.handleFinancialResultContinue} />;
      case 'tax':
        return <TaxInput ebt={actions.getProjectedEBTValue()} onBack={actions.handleStepBack} onContinue={actions.handleTaxContinue} />;
      case 'capex_wc':
        return <CapexWCInput onBack={actions.handleStepBack} onContinue={actions.handleCapexWCContinue} />;
      case 'wacc':
        return <WACCInput initialParams={waccParams ?? undefined} onBack={actions.handleStepBack} onContinue={actions.handleWACCContinue} />;
      case 'terminal_value':
        return <TerminalValueInput initialParams={tvParams ?? undefined} onBack={actions.handleStepBack} onContinue={actions.handleTerminalValueContinue} />;
      case 'equity_bridge':
        return <EquityBridgeInput initialParams={equityBridge ?? undefined} onBack={actions.handleStepBack} onContinue={actions.handleEquityBridgeContinue} />;
      case 'results':
        return valuationResult && waccResult ? (
          <ValuationResultsPanel
            valuationResult={valuationResult}
            waccResult={waccResult}
            projectedYears={projectedYears}
            sensitivityGrowth={sensitivityGrowth}
            sensitivityMultiple={sensitivityMultiple}
            currency="BRL"
            onBack={actions.handleStepBack}
          />
        ) : null;
      default:
        return <ExcelUpload data={leftSpreadsheetData} onDataLoaded={actions.setLeftSpreadsheetData} />;
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
              <ConfirmationBanner onConfirm={actions.handleConfirm} onReject={actions.handleReject} />
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
