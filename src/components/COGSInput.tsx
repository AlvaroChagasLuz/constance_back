import React, { useState, useMemo } from 'react';
import { Package, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface COGSInputProps {
  onBack?: () => void;
  onContinue?: (cogsPercent: number) => void;
}

export const COGSInput: React.FC<COGSInputProps> = ({
  onBack,
  onContinue,
}) => {
  const [cogsStr, setCogsStr] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const parsedValue = useMemo(() => {
    if (!cogsStr.trim()) return null;
    const num = parseFloat(cogsStr.replace(',', '.'));
    return isNaN(num) ? null : num;
  }, [cogsStr]);

  const isValid = parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
  const showError = touched && !isValid && cogsStr.trim() !== '';

  const handleContinue = () => {
    if (isValid && parsedValue !== null) {
      onContinue?.(parsedValue);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Package className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Custo (CMV)</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Informe o percentual de custo aplicado sobre a Receita Líquida. O CMV (Custo da Mercadoria Vendida), também chamado de COGS (Cost of Goods Sold), representa os custos diretamente atribuídos à produção ou entrega do produto/serviço vendido.
          </p>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="cogs-percent" className="text-xs text-muted-foreground">
              % de Custo sobre Receita Líquida
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentual do custo direto aplicado sobre a Receita Líquida. Inclui matéria-prima, mão de obra direta, custos de produção e outros custos diretamente ligados à entrega do produto ou serviço. Também pode ser chamado de CMV, COGS ou Cost of Goods Sold.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="cogs-percent"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 35,0"
              value={cogsStr}
              onChange={(e) => setCogsStr(e.target.value)}
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
