import React from 'react';
import { Trophy, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ValuationResult, WACCResult, SensitivityMatrix, ProjectedYear } from '@/engine/types';
import { formatCompact, formatPercent, formatMultiple, formatNumber } from '@/engine/format';

interface ValuationResultsPanelProps {
  valuationResult: ValuationResult;
  waccResult: WACCResult;
  projectedYears: ProjectedYear[];
  sensitivityGrowth: SensitivityMatrix | null;
  sensitivityMultiple: SensitivityMatrix | null;
  currency?: string;
  onBack?: () => void;
}

export const ValuationResultsPanel: React.FC<ValuationResultsPanelProps> = ({
  valuationResult,
  waccResult,
  projectedYears,
  sensitivityGrowth,
  currency = 'BRL',
  onBack,
}) => {
  const fmt = (v: number | null) => v !== null ? formatCompact(v, currency) : '—';

  return (
    <div className="h-full flex flex-col overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 p-6 pb-4">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Resultado do Valuation</h2>
      </div>

      <div className="flex-1 px-4 pb-6 space-y-4">
        {/* Main Equity Value cards */}
        {valuationResult.equityValueGordon !== null && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Equity Value (Gordon Growth)</p>
            <p className="text-2xl font-bold text-primary">{fmt(valuationResult.equityValueGordon)}</p>
            {valuationResult.pricePerShareGordon !== null && valuationResult.pricePerShareGordon !== valuationResult.equityValueGordon && (
              <p className="text-xs text-muted-foreground mt-1">
                Preço por Ação: {formatCompact(valuationResult.pricePerShareGordon, currency)}
              </p>
            )}
          </div>
        )}

        {valuationResult.equityValueExitMultiple !== null && (
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-xs text-muted-foreground mb-1">Equity Value (Exit Multiple)</p>
            <p className="text-2xl font-bold text-accent">{fmt(valuationResult.equityValueExitMultiple)}</p>
            {valuationResult.pricePerShareExitMultiple !== null && valuationResult.pricePerShareExitMultiple !== valuationResult.equityValueExitMultiple && (
              <p className="text-xs text-muted-foreground mt-1">
                Preço por Ação: {formatCompact(valuationResult.pricePerShareExitMultiple, currency)}
              </p>
            )}
          </div>
        )}

        {/* Key Metrics */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Métricas Chave</h3>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="WACC" value={formatPercent(waccResult.wacc)} />
            <Metric label="PV dos FCFs" value={fmt(valuationResult.pvOfFCFs)} />
            {valuationResult.terminalValue.gordonGrowth !== null && (
              <Metric label="TV (Gordon)" value={fmt(valuationResult.terminalValue.gordonGrowth)} />
            )}
            {valuationResult.terminalValue.exitMultiple !== null && (
              <Metric label="TV (Múltiplo)" value={fmt(valuationResult.terminalValue.exitMultiple)} />
            )}
            {valuationResult.enterpriseValueGordon !== null && (
              <Metric label="EV (Gordon)" value={fmt(valuationResult.enterpriseValueGordon)} />
            )}
            {valuationResult.enterpriseValueExitMultiple !== null && (
              <Metric label="EV (Múltiplo)" value={fmt(valuationResult.enterpriseValueExitMultiple)} />
            )}
            {valuationResult.tvAsPercentOfEVGordon !== null && (
              <Metric label="TV % do EV" value={formatPercent(valuationResult.tvAsPercentOfEVGordon)} />
            )}
          </div>
        </div>

        {/* FCF Summary */}
        {projectedYears.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Fluxo de Caixa Projetado</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Ano</th>
                    <th className="text-right py-1 px-1 text-muted-foreground font-medium">FCFF</th>
                    <th className="text-right py-1 px-1 text-muted-foreground font-medium">DF</th>
                    <th className="text-right py-1 pl-1 text-muted-foreground font-medium">PV</th>
                  </tr>
                </thead>
                <tbody>
                  {projectedYears.map((y, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1 pr-2 font-medium text-foreground">{y.year}</td>
                      <td className="py-1 px-1 text-right text-foreground">{formatCompact(y.fcff, currency)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{y.discountFactor.toFixed(4)}</td>
                      <td className="py-1 pl-1 text-right text-foreground">{formatCompact(y.pvFCF, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sensitivity Table */}
        {sensitivityGrowth && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Sensibilidade: WACC × Crescimento Perpétuo
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-1 text-muted-foreground">WACC \ g</th>
                    {sensitivityGrowth.colValues.map((g, j) => (
                      <th
                        key={j}
                        className={`text-center py-1 px-0.5 ${
                          j === sensitivityGrowth.baseColIndex ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        {g.toFixed(1)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityGrowth.rowValues.map((w, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className={`py-0.5 pr-1 font-medium ${
                        i === sensitivityGrowth.baseRowIndex ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}>
                        {w.toFixed(1)}%
                      </td>
                      {sensitivityGrowth.matrix[i].map((val, j) => {
                        const isBase = i === sensitivityGrowth.baseRowIndex && j === sensitivityGrowth.baseColIndex;
                        return (
                          <td
                            key={j}
                            className={`text-center py-0.5 px-0.5 ${
                              isBase
                                ? 'bg-primary/10 font-bold text-primary'
                                : val > 0
                                ? 'text-foreground'
                                : 'text-destructive'
                            }`}
                          >
                            {formatCompact(val, currency)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="pt-2">
          <Button variant="outline" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Ajustar Premissas
          </Button>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="py-1.5 px-3 bg-muted/30 rounded-md">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);
