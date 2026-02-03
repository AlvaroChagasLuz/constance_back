import React from 'react';
import { ProjectionPremises, DEFAULT_PREMISES } from '@/types/dre';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, ChevronRight, ChevronLeft, RotateCcw, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectionWizardProps {
  premises: ProjectionPremises;
  onPremisesChange: (premises: ProjectionPremises) => void;
  baseYear: string;
  onExport: () => void;
  isExporting: boolean;
}

const STEPS = [
  { id: 1, title: 'Premissas Gerais', icon: '⚙️' },
  { id: 2, title: 'Receita', icon: '📈' },
  { id: 3, title: 'Custos', icon: '💰' },
  { id: 4, title: 'Despesas', icon: '📊' },
  { id: 5, title: 'D&A / CAPEX', icon: '🏭' },
  { id: 6, title: 'Impostos', icon: '📋' },
  { id: 7, title: 'Resumo', icon: '✅' },
];

// Helper to generate column letters (A, B, C, ... Z, AA, AB, etc.)
const getColumnLetter = (index: number): string => {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

// Spreadsheet Cell component
const SpreadsheetCell: React.FC<{
  children?: React.ReactNode;
  isHeader?: boolean;
  isRowHeader?: boolean;
  className?: string;
  colSpan?: number;
}> = ({ children, isHeader, isRowHeader, className, colSpan }) => (
  <div
    className={cn(
      'border-r border-b border-border px-2 py-1.5 text-sm min-h-[36px] flex items-center',
      isHeader && 'bg-muted font-medium justify-center text-muted-foreground',
      isRowHeader && 'bg-muted font-medium justify-center text-muted-foreground min-w-[40px] max-w-[40px]',
      !isHeader && !isRowHeader && 'bg-background',
      className
    )}
    style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}
  >
    {children}
  </div>
);

// Spreadsheet Row component
const SpreadsheetRow: React.FC<{
  rowNumber: number;
  cells: React.ReactNode[];
  className?: string;
}> = ({ rowNumber, cells, className }) => (
  <div className={cn('contents', className)}>
    <SpreadsheetCell isRowHeader>{rowNumber}</SpreadsheetCell>
    {cells}
  </div>
);

export const ProjectionWizard: React.FC<ProjectionWizardProps> = ({
  premises,
  onPremisesChange,
  baseYear,
  onExport,
  isExporting,
}) => {
  const [currentStep, setCurrentStep] = React.useState(1);

  const updatePremise = <K extends keyof ProjectionPremises>(key: K, value: ProjectionPremises[K]) => {
    onPremisesChange({ ...premises, [key]: value });
  };

  const resetToDefaults = () => {
    onPremisesChange({ ...DEFAULT_PREMISES, baseYear });
  };

  const InfoTooltip: React.FC<{ content: string }> = ({ content }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Calculate number of columns needed for current step
  const getColumnsForStep = (step: number): number => {
    switch (step) {
      case 1: return 3; // Label, Value, Info
      case 2: return 4; // Label, Options/Value, Unit, Info
      case 3: return 4;
      case 4: return 4;
      case 5: return 4;
      case 6: return 4;
      case 7: return 3; // Summary
      default: return 3;
    }
  };

  const columns = getColumnsForStep(currentStep);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a">Anos de Projeção<InfoTooltip content="Quantidade de anos futuros a serem projetados a partir do ano base." /></SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={premises.projectionYears}
                    onChange={(e) => updatePremise('projectionYears', parseInt(e.target.value) || 5)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">anos</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">Ano Base<InfoTooltip content="Último ano com dados históricos. As projeções começam a partir deste ano." /></SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="text"
                    value={premises.baseYear || baseYear}
                    onChange={(e) => updatePremise('baseYear', e.target.value)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={3}
              cells={[
                <SpreadsheetCell key="a">Moeda</SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="text"
                    value={premises.currency}
                    onChange={(e) => updatePremise('currency', e.target.value)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows to fill space */}
            {[4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 2:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a" className="font-medium">Metodologia<InfoTooltip content="Escolha como a receita será projetada ao longo dos anos." /></SpreadsheetCell>,
                <SpreadsheetCell key="b" colSpan={2}>
                  <RadioGroup
                    value={premises.revenueMethod}
                    onValueChange={(v) => updatePremise('revenueMethod', v as 'growth_rate' | 'cagr' | 'manual')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="growth_rate" id="growth_rate" className="h-3.5 w-3.5" />
                      <Label htmlFor="growth_rate" className="text-xs font-normal cursor-pointer">Taxa fixa</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="cagr" id="cagr" className="h-3.5 w-3.5" />
                      <Label htmlFor="cagr" className="text-xs font-normal cursor-pointer">CAGR</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="manual" id="manual" className="h-3.5 w-3.5" />
                      <Label htmlFor="manual" className="text-xs font-normal cursor-pointer">Manual</Label>
                    </div>
                  </RadioGroup>
                </SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">Taxa de Crescimento<InfoTooltip content="Percentual de crescimento anual da receita." /></SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.revenueGrowthRate}
                    onChange={(e) => updatePremise('revenueGrowthRate', parseFloat(e.target.value) || 0)}
                    disabled={premises.revenueMethod === 'manual'}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center disabled:opacity-50"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows */}
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                  <SpreadsheetCell key="d"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 3:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a" className="font-medium">Método COGS<InfoTooltip content="Custo dos Produtos/Serviços Vendidos pode ser projetado como percentual da receita ou através de margem bruta alvo." /></SpreadsheetCell>,
                <SpreadsheetCell key="b" colSpan={2}>
                  <RadioGroup
                    value={premises.cogsMethod}
                    onValueChange={(v) => updatePremise('cogsMethod', v as 'revenue_percent' | 'gross_margin')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="revenue_percent" id="cogs_percent" className="h-3.5 w-3.5" />
                      <Label htmlFor="cogs_percent" className="text-xs font-normal cursor-pointer">% Receita</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="gross_margin" id="gross_margin" className="h-3.5 w-3.5" />
                      <Label htmlFor="gross_margin" className="text-xs font-normal cursor-pointer">Margem Bruta</Label>
                    </div>
                  </RadioGroup>
                </SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">
                  {premises.cogsMethod === 'revenue_percent' ? 'COGS (% Receita)' : 'Margem Bruta'}
                  <InfoTooltip content={premises.cogsMethod === 'revenue_percent' ? "Percentual da receita que será considerado como custo." : "Margem bruta desejada. O COGS será calculado automaticamente."} />
                </SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.cogsMethod === 'revenue_percent' ? premises.cogsPercent : premises.grossMarginPercent}
                    onChange={(e) => updatePremise(
                      premises.cogsMethod === 'revenue_percent' ? 'cogsPercent' : 'grossMarginPercent',
                      parseFloat(e.target.value) || 0
                    )}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows */}
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                  <SpreadsheetCell key="d"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 4:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a" className="font-medium">Método SG&A<InfoTooltip content="Despesas Operacionais (Vendas, Gerais e Administrativas)." /></SpreadsheetCell>,
                <SpreadsheetCell key="b" colSpan={2}>
                  <RadioGroup
                    value={premises.sgaMethod}
                    onValueChange={(v) => updatePremise('sgaMethod', v as 'revenue_percent' | 'fixed')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="revenue_percent" id="sga_percent" className="h-3.5 w-3.5" />
                      <Label htmlFor="sga_percent" className="text-xs font-normal cursor-pointer">% Receita</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="fixed" id="sga_fixed" className="h-3.5 w-3.5" />
                      <Label htmlFor="sga_fixed" className="text-xs font-normal cursor-pointer">Fixo + Crescimento</Label>
                    </div>
                  </RadioGroup>
                </SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">SG&A (% Receita)</SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.sgaPercent}
                    onChange={(e) => updatePremise('sgaPercent', parseFloat(e.target.value) || 0)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={3}
              cells={[
                <SpreadsheetCell key="a">Crescimento Anual</SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.sgaGrowthRate}
                    onChange={(e) => updatePremise('sgaGrowthRate', parseFloat(e.target.value) || 0)}
                    disabled={premises.sgaMethod !== 'fixed'}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center disabled:opacity-50"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows */}
            {[4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                  <SpreadsheetCell key="d"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 5:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a">Depreciação<InfoTooltip content="Percentual da receita destinado à depreciação e amortização." /></SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.depreciationPercent}
                    onChange={(e) => updatePremise('depreciationPercent', parseFloat(e.target.value) || 0)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">% Receita</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">CAPEX = D&A<InfoTooltip content="Assume que os investimentos anuais são iguais à depreciação para manter a capacidade produtiva." /></SpreadsheetCell>,
                <SpreadsheetCell key="b" className="justify-center">
                  <Switch
                    checked={premises.capexEqualsDepreciation}
                    onCheckedChange={(v) => updatePremise('capexEqualsDepreciation', v)}
                    className="data-[state=checked]:bg-accent"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">
                  {premises.capexEqualsDepreciation ? 'Sim' : 'Não'}
                </SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={3}
              cells={[
                <SpreadsheetCell key="a">CAPEX</SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.capexPercent}
                    onChange={(e) => updatePremise('capexPercent', parseFloat(e.target.value) || 0)}
                    disabled={premises.capexEqualsDepreciation}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center disabled:opacity-50"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">% Receita</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows */}
            {[4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                  <SpreadsheetCell key="d"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 6:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a">Alíquota Efetiva<InfoTooltip content="Taxa efetiva de imposto sobre o lucro (IR + CSLL no Brasil, geralmente 34%)." /></SpreadsheetCell>,
                <SpreadsheetCell key="b">
                  <Input
                    type="number"
                    step={0.5}
                    value={premises.taxRate}
                    onChange={(e) => updatePremise('taxRate', parseFloat(e.target.value) || 0)}
                    className="h-7 bg-transparent border-0 shadow-none focus-visible:ring-1 text-center"
                  />
                </SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a" colSpan={3} className="text-muted-foreground text-xs italic">
                  Nota: IR + CSLL padrão no Brasil = 34% (Lucro Real)
                </SpreadsheetCell>,
                <SpreadsheetCell key="d"></SpreadsheetCell>,
              ]}
            />
            {/* Empty rows */}
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <SpreadsheetRow
                key={n}
                rowNumber={n}
                cells={[
                  <SpreadsheetCell key="a"></SpreadsheetCell>,
                  <SpreadsheetCell key="b"></SpreadsheetCell>,
                  <SpreadsheetCell key="c"></SpreadsheetCell>,
                  <SpreadsheetCell key="d"></SpreadsheetCell>,
                ]}
              />
            ))}
          </>
        );

      case 7:
        return (
          <>
            <SpreadsheetRow
              rowNumber={1}
              cells={[
                <SpreadsheetCell key="a" className="font-medium text-accent">Premissa</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="font-medium text-accent">Valor</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="font-medium text-accent">Unidade</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={2}
              cells={[
                <SpreadsheetCell key="a">Anos projetados</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.projectionYears}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">anos</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={3}
              cells={[
                <SpreadsheetCell key="a">Crescimento receita</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.revenueGrowthRate}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={4}
              cells={[
                <SpreadsheetCell key="a">COGS</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.cogsPercent}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">% receita</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={5}
              cells={[
                <SpreadsheetCell key="a">SG&A</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.sgaPercent}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">% receita</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={6}
              cells={[
                <SpreadsheetCell key="a">Depreciação</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.depreciationPercent}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={7}
              cells={[
                <SpreadsheetCell key="a">Imposto</SpreadsheetCell>,
                <SpreadsheetCell key="b" className="text-center font-medium">{premises.taxRate}</SpreadsheetCell>,
                <SpreadsheetCell key="c" className="text-muted-foreground text-xs">%</SpreadsheetCell>,
              ]}
            />
            <SpreadsheetRow
              rowNumber={8}
              cells={[
                <SpreadsheetCell key="a" colSpan={3}>
                  <Button
                    onClick={onExport}
                    disabled={isExporting}
                    className="w-full h-8 text-sm bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {isExporting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Gerar Excel
                      </>
                    )}
                  </Button>
                </SpreadsheetCell>,
              ]}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Step Indicators - Like sheet tabs */}
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-r border-border whitespace-nowrap transition-colors',
              currentStep === step.id
                ? 'bg-background text-foreground border-b-2 border-b-accent'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              currentStep > step.id && 'text-accent'
            )}
          >
            {step.icon} {step.title}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefaults}
          className="text-muted-foreground hover:text-foreground mx-2"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Padrão
        </Button>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <div
          className="grid border-l border-t border-border min-w-fit"
          style={{
            gridTemplateColumns: `40px repeat(${columns}, minmax(120px, 1fr))`,
          }}
        >
          {/* Column headers (A, B, C...) */}
          <SpreadsheetCell isHeader className="border-t-0 border-l-0"></SpreadsheetCell>
          {Array.from({ length: columns }, (_, i) => (
            <SpreadsheetCell key={i} isHeader className="border-t-0">
              {getColumnLetter(i)}
            </SpreadsheetCell>
          ))}

          {/* Step content */}
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation - Like sheet footer */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Etapa {currentStep} de {STEPS.length}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="h-7 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Anterior
          </Button>
          
          {currentStep < STEPS.length && (
            <Button
              size="sm"
              onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
              className="h-7 text-xs bg-primary hover:bg-primary/90"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
