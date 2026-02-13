import React, { useState, useMemo } from 'react';
import { Briefcase, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SGAInputProps {
  grossProfit: number | null;
  onBack?: () => void;
  onContinue?: (sgaPercent: number) => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const SGAInput: React.FC<SGAInputProps> = ({
  grossProfit,
  onBack,
  onContinue,
}) => {
  const [sgaStr, setSgaStr] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const parsedValue = useMemo(() => {
    if (!sgaStr.trim()) return null;
    const num = parseFloat(sgaStr.replace(',', '.'));
    return isNaN(num) ? null : num;
  }, [sgaStr]);

  const isValid = parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
  const showError = touched && !isValid && sgaStr.trim() !== '';

  const sgaValue = useMemo(() => {
    if (!isValid || parsedValue === null || grossProfit === null) return null;
    return grossProfit * (parsedValue / 100);
  }, [isValid, parsedValue, grossProfit]);

  const ebitda = useMemo(() => {
    if (sgaValue === null || grossProfit === null) return null;
    return grossProfit - sgaValue;
  }, [sgaValue, grossProfit]);

  const handleContinue = () => {
    if (isValid && parsedValue !== null) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    if (isValid && parsedValue !== null) {
      setShowConfirm(false);
      onContinue?.(parsedValue);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Briefcase className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Despesas (SG&A)</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Informe o percentual de despesas operacionais aplicado sobre o Lucro Bruto. As Despesas (SG&A — Selling, General & Administrative) incluem custos com vendas, administrativos, marketing, aluguel, salários da equipe de suporte e demais gastos operacionais que não estão diretamente ligados à produção.
          </p>
        </div>

        {/* Input */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="sga-percent" className="text-xs text-muted-foreground">
              % de Despesas sobre Lucro Bruto
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Percentual de despesas operacionais aplicado sobre o Lucro Bruto. Inclui custos de vendas, marketing, administrativo, aluguel, salários de equipes de suporte e gestão, e demais despesas gerais da operação. Também pode ser chamado de Despesas, SG&A, Expenses ou Despesas Operacionais.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="sga-percent"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 25,0"
              value={sgaStr}
              onChange={(e) => setSgaStr(e.target.value)}
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

        {/* Preview card */}
        {grossProfit !== null && isValid && sgaValue !== null && ebitda !== null && (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lucro Bruto</span>
              <span className="font-medium text-foreground">R$ {formatBRL(grossProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) Despesas (SG&A)</span>
              <span className="font-medium text-destructive">R$ {formatBRL(sgaValue)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-medium text-foreground">(=) EBITDA</span>
              <span className="font-semibold text-foreground">R$ {formatBRL(ebitda)}</span>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Despesas (SG&A)</DialogTitle>
            <DialogDescription>
              Confirma o percentual de despesas informado? Você poderá alterar esse valor posteriormente.
            </DialogDescription>
          </DialogHeader>
          {grossProfit !== null && sgaValue !== null && ebitda !== null && parsedValue !== null && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro Bruto</span>
                <span className="font-medium text-foreground">R$ {formatBRL(grossProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">% de Despesas</span>
                <span className="font-medium text-foreground">{parsedValue.toLocaleString('pt-BR')}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">(−) Despesas (SG&A)</span>
                <span className="font-medium text-destructive">R$ {formatBRL(sgaValue)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-medium text-foreground">(=) EBITDA</span>
                <span className="font-semibold text-foreground">R$ {formatBRL(ebitda)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
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
