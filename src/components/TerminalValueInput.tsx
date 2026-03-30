import React, { useState } from 'react';
import { Infinity, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TerminalValueParameters, TerminalValueMethod } from '@/engine/types';
import { DEFAULT_TERMINAL_VALUE_PARAMETERS } from '@/engine/types';

interface TerminalValueInputProps {
  initialParams?: TerminalValueParameters;
  onBack?: () => void;
  onContinue?: (params: TerminalValueParameters) => void;
}

export const TerminalValueInput: React.FC<TerminalValueInputProps> = ({
  initialParams,
  onBack,
  onContinue,
}) => {
  const defaults = initialParams ?? DEFAULT_TERMINAL_VALUE_PARAMETERS;

  const [method, setMethod] = useState<TerminalValueMethod>(defaults.method);
  const [growthRate, setGrowthRate] = useState(String(defaults.perpetuityGrowthRate));
  const [exitMultiple, setExitMultiple] = useState(String(defaults.exitMultiple));

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const handleContinue = () => {
    onContinue?.({
      method,
      perpetuityGrowthRate: p(growthRate),
      exitMultiple: p(exitMultiple),
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Infinity className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Valor Terminal</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            O Valor Terminal representa o valor da empresa após o período de projeção explícita. Tipicamente representa 60-80% do Enterprise Value.
          </p>
        </div>

        {/* Method selector */}
        <div className="w-full space-y-3">
          <Label className="text-xs text-muted-foreground">Método</Label>
          <div className="flex gap-2">
            {([
              { key: 'gordon_growth', label: 'Gordon Growth' },
              { key: 'exit_multiple', label: 'Exit Multiple' },
              { key: 'both', label: 'Ambos' },
            ] as { key: TerminalValueMethod; label: string }[]).map(m => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors ${
                  method === m.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gordon Growth */}
        {(method === 'gordon_growth' || method === 'both') && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground">Gordon Growth (Perpetuidade)</span>
              <Tooltip>
                <TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">TV = FCF × (1 + g) / (WACC − g). A taxa de crescimento perpétuo (g) deve ser menor que o WACC e tipicamente menor que o crescimento do PIB nominal de longo prazo (2-4%).</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="pl-3">
              <Label className="text-xs text-muted-foreground">Taxa de Crescimento Perpétuo (g)</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 3,0"
                  value={growthRate}
                  onChange={e => setGrowthRate(e.target.value)}
                  className="text-center text-lg font-medium pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-1">
                Referência Brasil: inflação (~4%) + crescimento real (~1-2%) = 5-6% nominais em BRL
              </p>
            </div>
          </div>
        )}

        {/* Exit Multiple */}
        {(method === 'exit_multiple' || method === 'both') && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent" />
              <span className="text-sm font-semibold text-foreground">Múltiplo de Saída</span>
              <Tooltip>
                <TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">TV = EBITDA do último ano × Múltiplo EV/EBITDA. Abordagem de mercado que complementa o Gordon Growth.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="pl-3">
              <Label className="text-xs text-muted-foreground">Múltiplo EV/EBITDA de Saída</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 8,0"
                  value={exitMultiple}
                  onChange={e => setExitMultiple(e.target.value)}
                  className="text-center text-lg font-medium pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">x</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-1">
                Referência: mid-market Brasil 5-8x, large-cap 8-12x
              </p>
            </div>
          </div>
        )}

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
