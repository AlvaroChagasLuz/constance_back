import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FinancialModellingPanelProps {
  onYearsSelected?: (years: number) => void;
}

export const FinancialModellingPanel: React.FC<FinancialModellingPanelProps> = ({ onYearsSelected }) => {
  const [years, setYears] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setYears(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      onYearsSelected?.(num);
    }
  };

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
            className="text-center text-lg font-medium"
          />
        </div>
      </div>
    </div>
  );
};
