import React, { useState } from 'react';
import { BarChart3, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EBITDisplayProps {
  ebitda: number | null;
  da: number | null;
  onBack?: () => void;
  onContinue?: () => void;
}

const formatBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const EBITDisplay: React.FC<EBITDisplayProps> = ({
  ebitda,
  da,
  onBack,
  onContinue,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const ebit = ebitda !== null && da !== null ? Math.round((ebitda - da) * 100) / 100 : null;

  const handleContinue = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onContinue?.();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">EBIT</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            O EBIT (Earnings Before Interest and Taxes) representa o lucro operacional da empresa antes de juros e impostos. Ele é calculado automaticamente a partir do EBITDA menos a Depreciação & Amortização (D&A) informada anteriormente.
          </p>
        </div>

        {/* Summary Card */}
        {ebitda !== null && da !== null && ebit !== null && (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">EBITDA</span>
              <span className="font-medium text-foreground">{formatBRL(ebitda)}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) D&A</span>
              <span className="font-medium text-destructive">−{formatBRL(da)}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">(=) EBIT</span>
              <span className="font-semibold text-foreground">{formatBRL(ebit)}</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button
            onClick={handleContinue}
            disabled={ebit === null}
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
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar EBIT</DialogTitle>
            <DialogDescription>
              O EBIT foi calculado com base nos valores informados anteriormente. Deseja confirmar e avançar?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">EBITDA</span>
              <span className="font-medium text-foreground">{ebitda !== null ? formatBRL(ebitda) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">(−) D&A</span>
              <span className="font-medium text-destructive">{da !== null ? `−${formatBRL(da)}` : '—'}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">(=) EBIT</span>
              <span className="font-semibold text-foreground">{ebit !== null ? formatBRL(ebit) : '—'}</span>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
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
