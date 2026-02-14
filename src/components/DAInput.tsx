import React, { useState, useMemo } from 'react';
import { TrendingDown, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DAInputProps {
  onBack?: () => void;
  onContinue?: (daPercent: number) => void;
}

export const DAInput: React.FC<DAInputProps> = ({
  onBack,
  onContinue,
}) => {
  const [daStr, setDaStr] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const parsedValue = useMemo(() => {
    if (!daStr.trim()) return null;
    const num = parseFloat(daStr.replace(',', '.'));
    return isNaN(num) ? null : num;
  }, [daStr]);

  const isValid = parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
  const showError = touched && !isValid && daStr.trim() !== '';

  const handleContinue = () => {
    if (isValid && parsedValue !== null) {
      onContinue?.(parsedValue);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <TrendingDown className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Depreciação e Amortização (D&A)</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Informe o percentual de Depreciação e Amortização aplicado sobre a Receita Líquida. A D&A representa a perda de valor de ativos tangíveis (depreciação) e intangíveis (amortização) ao longo do tempo, como máquinas, equipamentos, software, patentes e licenças.
          </p>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="da-percent" className="text-xs text-muted-foreground">
              % de D&A sobre Receita Líquida
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentual de Depreciação e Amortização aplicado sobre a Receita Líquida. A Depreciação refere-se à perda de valor de ativos físicos (máquinas, veículos, equipamentos), enquanto a Amortização se aplica a ativos intangíveis (software, patentes, marcas, licenças). Também pode ser chamado de D&A, Depreciação, Depreciation, Amortization ou Depreciação e Amortização.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="da-percent"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 5,0"
              value={daStr}
              onChange={(e) => setDaStr(e.target.value)}
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
              Insira um valor entre 0 e 100.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full gap-2"
          >
            Continuar
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
