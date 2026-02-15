import React, { useState, useMemo } from 'react';
import { DollarSign, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface FinancialResultInputProps {
  onBack?: () => void;
  onContinue?: (financialResultPercent: number) => void;
  netRevenue: number | null;
  ebit: number | null;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const FinancialResultInput: React.FC<FinancialResultInputProps> = ({
  onBack,
  onContinue,
  netRevenue,
  ebit,
}) => {
  const [percentStr, setPercentStr] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const parsedValue = useMemo(() => {
    if (!percentStr.trim()) return null;
    const num = parseFloat(percentStr.replace(',', '.'));
    return isNaN(num) ? null : num;
  }, [percentStr]);

  const isValid = parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
  const showError = touched && !isValid && percentStr.trim() !== '';

  const financialResultBRL = useMemo(() => {
    if (!isValid || parsedValue === null || netRevenue === null) return null;
    return Math.round(netRevenue * (parsedValue / 100) * 100) / 100;
  }, [isValid, parsedValue, netRevenue]);

  const ebtValue = useMemo(() => {
    if (ebit === null || financialResultBRL === null) return null;
    return Math.round((ebit - financialResultBRL) * 100) / 100;
  }, [ebit, financialResultBRL]);

  const handleContinue = () => {
    if (isValid) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
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
          <h2 className="text-base font-semibold text-foreground">Resultado Financeiro</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Informe o percentual da Receita Líquida que representa o Resultado Financeiro (receitas e despesas financeiras). O Resultado Financeiro inclui juros sobre empréstimos, receitas de aplicações financeiras, variações cambiais e demais itens financeiros não operacionais. Também pode ser chamado de Receita Financeira, Financial Revenue ou Financial Results.
          </p>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="financial-result-percent" className="text-xs text-muted-foreground">
              % de Resultado Financeiro sobre Receita Líquida
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentual da Receita Líquida que representa o resultado financeiro líquido da empresa. Inclui juros pagos sobre dívidas, receitas de aplicações financeiras, variações cambiais e outros itens financeiros. Também pode ser chamado de Receita Financeira, Resultado Financeiro, Financial Revenue ou Financial Results. O valor será aplicado como negativo (despesa financeira líquida).
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="financial-result-percent"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 5,0"
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
              Insira um valor entre 0 e 100.
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">
            O percentual informado será aplicado como valor negativo (despesa financeira).
          </p>
        </div>

        {/* Real-time preview */}
        {isValid && (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita Líquida</span>
              <span className="font-medium text-foreground">{netRevenue !== null ? formatBRL(netRevenue) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EBIT</span>
              <span className="font-medium text-foreground">{ebit !== null ? formatBRL(ebit) : '—'}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) Resultado Financeiro</span>
              <span className="font-medium text-destructive">
                {financialResultBRL !== null ? formatBRL(-financialResultBRL) : '—'}
              </span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">(=) EBT (Lucro antes do IR)</span>
              <span className="text-foreground">
                {ebtValue !== null ? formatBRL(ebtValue) : '—'}
              </span>
            </div>
          </div>
        )}

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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Resultado Financeiro</DialogTitle>
            <DialogDescription>
              Confirma o percentual de Resultado Financeiro informado? Você poderá alterar esse valor posteriormente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita Líquida</span>
              <span className="font-medium">{netRevenue !== null ? formatBRL(netRevenue) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EBIT</span>
              <span className="font-medium">{ebit !== null ? formatBRL(ebit) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">% Resultado Financeiro</span>
              <span className="font-medium">{parsedValue}%</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) Resultado Financeiro</span>
              <span className="font-medium text-destructive">
                {financialResultBRL !== null ? formatBRL(-financialResultBRL) : '—'}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>(=) EBT</span>
              <span>{ebtValue !== null ? formatBRL(ebtValue) : '—'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Editar
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
