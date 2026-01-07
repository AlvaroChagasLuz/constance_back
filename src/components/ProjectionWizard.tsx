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
        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="projectionYears">Anos de Projeção</Label>
                <InfoTooltip content="Quantidade de anos futuros a serem projetados a partir do ano base." />
              </div>
              <Input
                id="projectionYears"
                type="number"
                min={1}
                max={10}
                value={premises.projectionYears}
                onChange={(e) => updatePremise('projectionYears', parseInt(e.target.value) || 5)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="baseYear">Ano Base</Label>
                <InfoTooltip content="Último ano com dados históricos. As projeções começam a partir deste ano." />
              </div>
              <Input
                id="baseYear"
                type="text"
                value={premises.baseYear || baseYear}
                onChange={(e) => updatePremise('baseYear', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Moeda</Label>
              <Input
                type="text"
                value={premises.currency}
                onChange={(e) => updatePremise('currency', e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Metodologia de Crescimento</Label>
                <InfoTooltip content="Escolha como a receita será projetada ao longo dos anos." />
              </div>
              <RadioGroup
                value={premises.revenueMethod}
                onValueChange={(v) => updatePremise('revenueMethod', v as 'growth_rate' | 'cagr' | 'manual')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="growth_rate" id="growth_rate" />
                  <Label htmlFor="growth_rate" className="font-normal cursor-pointer">
                    Taxa de crescimento anual fixa
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cagr" id="cagr" />
                  <Label htmlFor="cagr" className="font-normal cursor-pointer">
                    CAGR (Taxa composta)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="font-normal cursor-pointer">
                    Valores manuais por ano
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {premises.revenueMethod !== 'manual' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="revenueGrowth">Taxa de Crescimento (%)</Label>
                  <InfoTooltip content="Percentual de crescimento anual da receita." />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="revenueGrowth"
                    type="number"
                    step={0.5}
                    value={premises.revenueGrowthRate}
                    onChange={(e) => updatePremise('revenueGrowthRate', parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Como projetar COGS</Label>
                <InfoTooltip content="Custo dos Produtos/Serviços Vendidos pode ser projetado como percentual da receita ou através de margem bruta alvo." />
              </div>
              <RadioGroup
                value={premises.cogsMethod}
                onValueChange={(v) => updatePremise('cogsMethod', v as 'revenue_percent' | 'gross_margin')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="revenue_percent" id="cogs_percent" />
                  <Label htmlFor="cogs_percent" className="font-normal cursor-pointer">
                    Como % da receita
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gross_margin" id="gross_margin" />
                  <Label htmlFor="gross_margin" className="font-normal cursor-pointer">
                    Margem bruta alvo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {premises.cogsMethod === 'revenue_percent' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cogsPercent">COGS (% da Receita)</Label>
                  <InfoTooltip content="Percentual da receita que será considerado como custo." />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="cogsPercent"
                    type="number"
                    step={0.5}
                    value={premises.cogsPercent}
                    onChange={(e) => updatePremise('cogsPercent', parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="grossMargin">Margem Bruta Alvo (%)</Label>
                  <InfoTooltip content="Margem bruta desejada. O COGS será calculado automaticamente." />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="grossMargin"
                    type="number"
                    step={0.5}
                    value={premises.grossMarginPercent}
                    onChange={(e) => updatePremise('grossMarginPercent', parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Como projetar SG&A</Label>
                <InfoTooltip content="Despesas Operacionais (Vendas, Gerais e Administrativas)." />
              </div>
              <RadioGroup
                value={premises.sgaMethod}
                onValueChange={(v) => updatePremise('sgaMethod', v as 'revenue_percent' | 'fixed')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="revenue_percent" id="sga_percent" />
                  <Label htmlFor="sga_percent" className="font-normal cursor-pointer">
                    Como % da receita
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="sga_fixed" />
                  <Label htmlFor="sga_fixed" className="font-normal cursor-pointer">
                    Valor fixo com crescimento
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sgaPercent">SG&A (% da Receita)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="sgaPercent"
                  type="number"
                  step={0.5}
                  value={premises.sgaPercent}
                  onChange={(e) => updatePremise('sgaPercent', parseFloat(e.target.value) || 0)}
                  className="bg-background"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            {premises.sgaMethod === 'fixed' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sgaGrowth">Crescimento Anual (%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="sgaGrowth"
                    type="number"
                    step={0.5}
                    value={premises.sgaGrowthRate}
                    onChange={(e) => updatePremise('sgaGrowthRate', parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="depreciation">Depreciação (% da Receita)</Label>
                <InfoTooltip content="Percentual da receita destinado à depreciação e amortização." />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="depreciation"
                  type="number"
                  step={0.5}
                  value={premises.depreciationPercent}
                  onChange={(e) => updatePremise('depreciationPercent', parseFloat(e.target.value) || 0)}
                  className="bg-background"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <Label htmlFor="capexEquals">CAPEX = Depreciação</Label>
                <InfoTooltip content="Assume que os investimentos anuais são iguais à depreciação para manter a capacidade produtiva." />
              </div>
              <Switch
                id="capexEquals"
                checked={premises.capexEqualsDepreciation}
                onCheckedChange={(v) => updatePremise('capexEqualsDepreciation', v)}
              />
            </div>

            {!premises.capexEqualsDepreciation && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="capex">CAPEX (% da Receita)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="capex"
                    type="number"
                    step={0.5}
                    value={premises.capexPercent}
                    onChange={(e) => updatePremise('capexPercent', parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="taxRate">Alíquota Efetiva de Imposto (%)</Label>
                <InfoTooltip content="Taxa efetiva de imposto sobre o lucro (IR + CSLL no Brasil, geralmente 34%)." />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="taxRate"
                  type="number"
                  step={0.5}
                  value={premises.taxRate}
                  onChange={(e) => updatePremise('taxRate', parseFloat(e.target.value) || 0)}
                  className="bg-background"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> A alíquota padrão de IR + CSLL no Brasil é de 34% para empresas no regime de Lucro Real.
              </p>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-slide-in-right">
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h3 className="font-semibold text-accent mb-3 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Resumo das Premissas
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anos projetados:</span>
                  <span className="font-medium">{premises.projectionYears}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crescimento da receita:</span>
                  <span className="font-medium">{premises.revenueGrowthRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COGS:</span>
                  <span className="font-medium">{premises.cogsPercent}% da receita</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SG&A:</span>
                  <span className="font-medium">{premises.sgaPercent}% da receita</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Depreciação:</span>
                  <span className="font-medium">{premises.depreciationPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imposto:</span>
                  <span className="font-medium">{premises.taxRate}%</span>
                </div>
              </div>
            </div>

            <Button
              onClick={onExport}
              disabled={isExporting}
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Gerando Excel...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Gerar e Baixar Excel
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                'step-indicator flex-shrink-0 transition-all duration-300',
                currentStep === step.id && 'step-active scale-110',
                currentStep > step.id && 'step-completed',
                currentStep < step.id && 'step-pending'
              )}
            >
              {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 transition-colors duration-300 min-w-[20px]',
                  currentStep > step.id ? 'bg-accent' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current Step Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>{STEPS[currentStep - 1].icon}</span>
          {STEPS[currentStep - 1].title}
        </h3>
        <Button variant="ghost" size="sm" onClick={resetToDefaults} className="text-muted-foreground hover:text-foreground">
          <RotateCcw className="w-4 h-4 mr-1" />
          Padrão
        </Button>
      </div>

      {/* Step Content */}
      <div className="min-h-[280px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        
        {currentStep < STEPS.length && (
          <Button
            onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
            className="bg-primary hover:bg-primary/90"
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
