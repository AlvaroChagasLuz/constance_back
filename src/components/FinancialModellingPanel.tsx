import React, { useState } from 'react';
import { TrendingUp, ArrowRight, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface FinancialModellingPanelProps {
  onContinue?: (years: number, lastClosedYear: number) => void;
  yearsRowWarning?: string | null;
}

export const FinancialModellingPanel: React.FC<FinancialModellingPanelProps> = ({ onContinue, yearsRowWarning }) => {
  const currentCalendarYear = new Date().getFullYear();
  const defaultLastClosedYear = currentCalendarYear - 1;

  const [years, setYears] = useState<string>('');
  const [lastClosedYear, setLastClosedYear] = useState<string>(String(defaultLastClosedYear));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYears(e.target.value);
  };

  const handleLastClosedYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastClosedYear(e.target.value);
  };

  const parsedYears = parseInt(years, 10);
  const parsedLastClosedYear = parseInt(lastClosedYear, 10);
  const isYearsValid = !isNaN(parsedYears) && parsedYears > 0 && parsedYears <= 30;
  const isLastClosedYearValid = !isNaN(parsedLastClosedYear) && parsedLastClosedYear >= 1990 && parsedLastClosedYear <= 2100;
  const isValid = isYearsValid && isLastClosedYearValid;

  const handleContinue = () => {
    if (isValid) {
      onContinue?.(parsedYears, parsedLastClosedYear);
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

        {/* Years Row Warning */}
        {yearsRowWarning && (
          <div className="w-full rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-xs text-destructive leading-relaxed">{yearsRowWarning}</p>
          </div>
        )}

        {/* Last Closed Year */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="last-closed-year" className="text-xs text-muted-foreground">
              Último ano fechado / Last completed fiscal year
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  O último ano fiscal para o qual existem dados completos. A projeção começará a partir do ano seguinte.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="last-closed-year"
              type="number"
              min={1990}
              max={2100}
              placeholder={`Ex: ${defaultLastClosedYear}`}
              value={lastClosedYear}
              onChange={handleLastClosedYearChange}
              className="text-center text-lg font-medium pl-10"
            />
          </div>
          {isLastClosedYearValid && (
            <p className="text-[10px] text-muted-foreground">
              Projeção iniciará em <span className="font-semibold">{parsedLastClosedYear + 1}</span>
            </p>
          )}
        </div>

        {/* Number of projection years */}
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
              if (e.key === 'Enter' && isValid) handleContinue();
            }}
            className="text-center text-lg font-medium"
          />
        </div>

        <Button
          onClick={handleContinue}
          disabled={!isValid}
          className="w-full gap-2"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
