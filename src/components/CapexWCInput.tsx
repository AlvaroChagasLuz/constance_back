import React, { useState } from 'react';
import { Factory, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FCFAssumptions, CapexMethod, WorkingCapitalMethod } from '@/engine/types';
import { DEFAULT_FCF_ASSUMPTIONS } from '@/engine/types';

interface CapexWCInputProps {
  onBack?: () => void;
  onContinue?: (assumptions: FCFAssumptions) => void;
}

export const CapexWCInput: React.FC<CapexWCInputProps> = ({ onBack, onContinue }) => {
  const [capexMethod, setCapexMethod] = useState<CapexMethod>('equals_da');
  const [capexPct, setCapexPct] = useState('5');
  const [wcMethod, setWcMethod] = useState<WorkingCapitalMethod>('percent_of_revenue');
  const [wcPct, setWcPct] = useState('10');
  const [dso, setDso] = useState('45');
  const [dio, setDio] = useState('30');
  const [dpo, setDpo] = useState('40');

  const handleContinue = () => {
    const assumptions: FCFAssumptions = {
      ...DEFAULT_FCF_ASSUMPTIONS,
      capexMethod,
      capexPercentOfRevenue: parseFloat(capexPct.replace(',', '.')) || 5,
      workingCapitalMethod: wcMethod,
      wcPercentOfRevenue: parseFloat(wcPct.replace(',', '.')) || 10,
      wcDSO: parseInt(dso) || 45,
      wcDIO: parseInt(dio) || 30,
      wcDPO: parseInt(dpo) || 40,
    };
    onContinue?.(assumptions);
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Factory className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">CapEx & Capital de Giro</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Defina como projetar investimentos (CapEx) e variações de capital de giro para calcular o Fluxo de Caixa Livre (FCFF).
          </p>
        </div>

        {/* CapEx Section */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <span className="text-sm font-semibold text-foreground">CapEx</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Capital Expenditures — investimentos em ativos fixos (máquinas, equipamentos, imóveis). Representa a saída de caixa para manutenção e expansão do negócio.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="pl-3 space-y-2">
            <div className="flex gap-2">
              {(['equals_da', 'percent_of_revenue'] as CapexMethod[]).map(m => (
                <button
                  key={m}
                  onClick={() => setCapexMethod(m)}
                  className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors ${
                    capexMethod === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {m === 'equals_da' ? 'CapEx = D&A' : '% da Receita'}
                </button>
              ))}
            </div>

            {capexMethod === 'percent_of_revenue' && (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 5,0"
                  value={capexPct}
                  onChange={e => setCapexPct(e.target.value)}
                  className="text-center text-lg font-medium pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
              </div>
            )}

            {capexMethod === 'equals_da' && (
              <p className="text-xs text-muted-foreground italic">
                CapEx igual à Depreciação & Amortização (cenário de manutenção — sem crescimento líquido de ativos).
              </p>
            )}
          </div>
        </div>

        {/* Working Capital Section */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <span className="text-sm font-semibold text-foreground">Capital de Giro (ΔWC)</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Variação de capital de giro — caixa consumido (ou liberado) pela operação. Inclui Contas a Receber, Estoques e Contas a Pagar.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="pl-3 space-y-2">
            <div className="flex gap-2">
              {(['percent_of_revenue', 'days'] as WorkingCapitalMethod[]).map(m => (
                <button
                  key={m}
                  onClick={() => setWcMethod(m)}
                  className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors ${
                    wcMethod === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {m === 'percent_of_revenue' ? '% da Receita' : 'Por Dias'}
                </button>
              ))}
            </div>

            {wcMethod === 'percent_of_revenue' && (
              <div className="relative">
                <Label className="text-xs text-muted-foreground">Capital de Giro como % da Receita Líquida</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 10,0"
                  value={wcPct}
                  onChange={e => setWcPct(e.target.value)}
                  className="text-center text-lg font-medium pr-8 mt-1"
                />
                <span className="absolute right-3 bottom-2 text-muted-foreground text-sm font-medium">%</span>
              </div>
            )}

            {wcMethod === 'days' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">DSO (Prazo Médio de Recebimento)</Label>
                  <div className="relative mt-1">
                    <Input type="number" value={dso} onChange={e => setDso(e.target.value)} className="text-center pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">dias</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">DIO (Prazo Médio de Estoque)</Label>
                  <div className="relative mt-1">
                    <Input type="number" value={dio} onChange={e => setDio(e.target.value)} className="text-center pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">dias</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">DPO (Prazo Médio de Pagamento)</Label>
                  <div className="relative mt-1">
                    <Input type="number" value={dpo} onChange={e => setDpo(e.target.value)} className="text-center pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">dias</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Ciclo de Caixa = DSO + DIO − DPO = {(parseInt(dso) || 0) + (parseInt(dio) || 0) - (parseInt(dpo) || 0)} dias
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button onClick={handleContinue} className="w-full gap-2">
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};
