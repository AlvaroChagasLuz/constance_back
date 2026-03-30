import React, { useState } from 'react';
import { Scale, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EquityBridgeParameters } from '@/engine/types';
import { DEFAULT_EQUITY_BRIDGE } from '@/engine/types';

interface EquityBridgeInputProps {
  initialParams?: EquityBridgeParameters;
  onBack?: () => void;
  onContinue?: (params: EquityBridgeParameters) => void;
}

export const EquityBridgeInput: React.FC<EquityBridgeInputProps> = ({
  initialParams,
  onBack,
  onContinue,
}) => {
  const defaults = initialParams ?? DEFAULT_EQUITY_BRIDGE;

  const [totalDebt, setTotalDebt] = useState(String(defaults.totalDebt));
  const [cash, setCash] = useState(String(defaults.cashAndEquivalents));
  const [nonOp, setNonOp] = useState(String(defaults.nonOperatingAssets));
  const [minority, setMinority] = useState(String(defaults.minorityInterest));
  const [shares, setShares] = useState(String(defaults.sharesOutstanding));

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const handleContinue = () => {
    onContinue?.({
      totalDebt: p(totalDebt),
      cashAndEquivalents: p(cash),
      nonOperatingAssets: p(nonOp),
      minorityInterest: p(minority),
      sharesOutstanding: p(shares) || 1,
    });
  };

  const field = (
    label: string,
    tooltip: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string
  ) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
          <TooltipContent className="max-w-xs"><p className="text-sm">{tooltip}</p></TooltipContent>
        </Tooltip>
      </div>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={e => setter(e.target.value)}
        className="text-center text-sm font-medium h-8"
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center justify-start p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Scale className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Equity Bridge</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Converte o Enterprise Value em Equity Value. Informe os valores na data da avaliação.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Equity = EV − Dívida + Caixa + Ativos Não-Operacionais − Minoritários
          </p>
        </div>

        <div className="w-full space-y-3">
          {field(
            'Dívida Total (−)',
            'Dívida bruta total (empréstimos, debêntures, financiamentos) na data base da avaliação.',
            totalDebt, setTotalDebt, 'Ex: 50000000'
          )}
          {field(
            'Caixa e Equivalentes (+)',
            'Caixa, aplicações financeiras de curto prazo e equivalentes de caixa.',
            cash, setCash, 'Ex: 20000000'
          )}
          {field(
            'Ativos Não-Operacionais (+)',
            'Investimentos, imóveis não operacionais, participações em outras empresas.',
            nonOp, setNonOp, 'Ex: 0'
          )}
          {field(
            'Participação Minoritária (−)',
            'Participação de acionistas minoritários em subsidiárias consolidadas.',
            minority, setMinority, 'Ex: 0'
          )}

          <div className="border-t border-border pt-3">
            {field(
              'Ações em Circulação',
              'Total de ações outstanding (para cálculo do preço por ação). Use 1 se não aplicável.',
              shares, setShares, 'Ex: 1000000'
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button onClick={handleContinue} className="w-full gap-2">
            Calcular Valuation <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};
