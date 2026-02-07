import React, { useState } from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FinancialModellingPanelProps {
  onYearsConfirmed?: (years: number) => void;
}

export const FinancialModellingPanel: React.FC<FinancialModellingPanelProps> = ({ onYearsConfirmed }) => {
  const [years, setYears] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYears(e.target.value);
  };

  const handleConfirm = () => {
    const num = parseInt(years, 10);
    if (!isNaN(num) && num > 0 && num <= 30) {
      onYearsConfirmed?.(num);
    }
  };

  const isValid = (() => {
    const num = parseInt(years, 10);
    return !isNaN(num) && num > 0 && num <= 30;
  })();

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Modelagem Financeira</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure os parâmetros da sua projeção
          </p>
        </div>
        <div className="w-full space-y-2">
          <Label htmlFor="projection-years" className="text-xs text-muted-foreground">
            Quantos anos deseja projetar?
          </Label>
          <Input
            id="projection-years"
            type="number"
            min={1}
            max={30}
            placeholder="Ex: 5"
            value={years}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) handleConfirm();
            }}
            className="text-center text-lg font-medium"
          />
        </div>
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Projetar {isValid ? `${years} ano${parseInt(years) > 1 ? 's' : ''}` : ''}
          </Button>
          <Button
            variant="outline"
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full gap-2"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
