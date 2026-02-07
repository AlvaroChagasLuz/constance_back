import React, { useState } from 'react';
import { BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ProjectionAssumptionsProps {
  onApply?: (revenueGrowthRate: number) => void;
  onContinue?: () => void;
  hasApplied?: boolean;
}

export const ProjectionAssumptions: React.FC<ProjectionAssumptionsProps> = ({
  onApply,
  onContinue,
  hasApplied = false,
}) => {
  const [growthRate, setGrowthRate] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGrowthRate(e.target.value);
  };

  const handleApply = () => {
    const num = parseFloat(growthRate);
    if (!isNaN(num)) {
      onApply?.(num);
    }
  };

  const isValid = (() => {
    const num = parseFloat(growthRate);
    return !isNaN(num);
  })();

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Income Statement Assumptions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Defina as premissas para a projeção
          </p>
        </div>

        {/* Revenue Section */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <span className="text-sm font-semibold text-foreground">Revenue</span>
          </div>
          <div className="space-y-2 pl-3">
            <Label htmlFor="revenue-growth" className="text-xs text-muted-foreground">
              Revenue Growth Rate (%)
            </Label>
            <Input
              id="revenue-growth"
              type="number"
              step="0.1"
              placeholder="Ex: 10.5"
              value={growthRate}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid && !hasApplied) handleApply();
              }}
              className="text-center text-lg font-medium"
            />
            <p className="text-[10px] text-muted-foreground">
              Taxa de crescimento anual aplicada à receita projetada
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <Button
            onClick={handleApply}
            disabled={!isValid || hasApplied}
            className="w-full gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Projetar Receita
          </Button>
          <Button
            variant="outline"
            onClick={onContinue}
            disabled={!hasApplied}
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
