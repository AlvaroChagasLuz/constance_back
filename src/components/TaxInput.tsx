import React, { useState, useMemo } from 'react';
import { DollarSign, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TaxInputProps {
  ebt: number | null;
  onBack?: () => void;
  onContinue?: (taxPercent: number) => void;
}

const formatBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const TaxInput: React.FC<TaxInputProps> = ({
  ebt,
  onBack,
  onContinue,
}) => {
  const [percentStr, setPercentStr] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const parsedValue = (() => {
    if (!percentStr.trim()) return null;
    const num = parseFloat(percentStr.replace(',', '.'));
    return isNaN(num) ? null : num;
  })();

  const isValid = parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
  const showError = touched && !isValid && percentStr.trim() !== '';

  // Real-time preview calculations
  const preview = useMemo(() => {
    if (ebt == null || parsedValue == null || !isValid) return null;

    // If EBT < 0, tax = 0 and net income = EBT
    if (ebt < 0) {
      return {
        ebt,
        tax: 0,
        netIncome: ebt,
      };
    }

    const tax = Math.round(ebt * (parsedValue / 100) * 100) / 100;
    const netIncome = Math.round((ebt - tax) * 100) / 100;

    return { ebt, tax, netIncome };
  }, [ebt, parsedValue, isValid]);

  const handleContinue = () => {
    if (isValid && parsedValue !== null) {
      onContinue?.(parsedValue);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <DollarSign className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Impostos / Tax</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Informe a alíquota de imposto que será aplicada sobre o Lucro antes do Imposto (EBT) ao longo de toda a projeção. O imposto também pode ser chamado de Tax, Impostos sobre o Lucro, IR/CSLL ou Income Tax.
          </p>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="tax-percent" className="text-xs text-muted-foreground">
              Alíquota de Imposto (%)
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentual de imposto aplicado sobre o EBT (Lucro antes do Imposto de Renda). No Brasil, a alíquota combinada de IRPJ + CSLL para empresas do Lucro Real é geralmente 34%. Também chamado de Tax, Impostos sobre Lucro, IR/CSLL ou Income Tax.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="tax-percent"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 34,0"
              value={percentStr}
              onChange={(e) => setPercentStr(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) handleContinue();
              }}
              className={`text-center text-lg font-medium pr-8 ${
                showError ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              %
            </span>
          </div>
          {showError && (
            <p className="text-xs text-destructive">
              Insira uma alíquota entre 0% e 100%.
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">
            A alíquota informada será aplicada de forma fixa sobre o EBT em todos os períodos da projeção.
          </p>
        </div>


        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full gap-2"
          >
            Confirmar e Continuar
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
      </div>

    </div>
  );
};
