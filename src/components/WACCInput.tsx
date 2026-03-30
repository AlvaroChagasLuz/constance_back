import React, { useState, useMemo } from 'react';
import { Percent, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { WACCParameters } from '@/engine/types';
import { DEFAULT_WACC_PARAMETERS } from '@/engine/types';
import { calculateWACC } from '@/engine/wacc';

interface WACCInputProps {
  initialParams?: WACCParameters;
  onBack?: () => void;
  onContinue?: (params: WACCParameters) => void;
}

export const WACCInput: React.FC<WACCInputProps> = ({
  initialParams,
  onBack,
  onContinue,
}) => {
  const defaults = initialParams ?? DEFAULT_WACC_PARAMETERS;

  const [rf, setRf] = useState(String(defaults.riskFreeRate));
  const [beta, setBeta] = useState(String(defaults.leveredBeta));
  const [erp, setErp] = useState(String(defaults.equityRiskPremium));
  const [sizePrem, setSizePrem] = useState(String(defaults.sizePremium));
  const [crp, setCrp] = useState(String(defaults.countryRiskPremium));
  const [companyRisk, setCompanyRisk] = useState(String(defaults.companySpecificRisk));
  const [kd, setKd] = useState(String(defaults.costOfDebt));
  const [taxDebt, setTaxDebt] = useState(String(defaults.taxRateForDebt));
  const [eqVal, setEqVal] = useState(String(defaults.equityValue));
  const [debtVal, setDebtVal] = useState(String(defaults.debtValue));

  const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const params: WACCParameters = useMemo(() => ({
    riskFreeRate: p(rf),
    leveredBeta: p(beta),
    equityRiskPremium: p(erp),
    sizePremium: p(sizePrem),
    countryRiskPremium: p(crp),
    companySpecificRisk: p(companyRisk),
    costOfDebt: p(kd),
    taxRateForDebt: p(taxDebt),
    equityValue: p(eqVal),
    debtValue: p(debtVal),
  }), [rf, beta, erp, sizePrem, crp, companyRisk, kd, taxDebt, eqVal, debtVal]);

  const result = useMemo(() => calculateWACC(params), [params]);

  const handleContinue = () => onContinue?.(params);

  const field = (label: string, tooltip: string, value: string, setter: (v: string) => void, suffix = '%') => (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
          <TooltipContent className="max-w-xs"><p className="text-sm">{tooltip}</p></TooltipContent>
        </Tooltip>
      </div>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => setter(e.target.value)}
          className="text-center text-sm font-medium pr-8 h-8"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center justify-start p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <Percent className="w-7 h-7 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">WACC — Custo de Capital</h2>
          <p className="text-xs text-muted-foreground mt-1">Taxa de desconto para o DCF (CAPM + Custo da Dívida)</p>
        </div>

        {/* Cost of Equity */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <span className="text-sm font-semibold text-foreground">Custo do Equity (Ke) — CAPM</span>
          </div>
          <div className="pl-3 space-y-2">
            {field('Taxa Livre de Risco (Rf)', 'US Treasury 10Y. Base para o CAPM.', rf, setRf)}
            {field('Beta Alavancado (β)', 'Sensibilidade da ação ao mercado. 1.0 = mercado.', beta, setBeta, '')}
            {field('Prêmio de Risco de Mercado (ERP)', 'Retorno excedente do mercado sobre a taxa livre de risco.', erp, setErp)}
            {field('Prêmio de Tamanho', 'Prêmio para empresas menores (Ibbotson/Duff & Phelps).', sizePrem, setSizePrem)}
            {field('Risco País (CRP)', 'Country Risk Premium — Damodaran para Brasil ≈ 3%.', crp, setCrp)}
            {field('Risco Específico', 'Prêmio adicional por riscos da empresa (iliquidez, dependência, etc.).', companyRisk, setCompanyRisk)}
          </div>
          <div className="pl-3 py-1.5 px-3 bg-primary/5 rounded-md">
            <span className="text-xs text-muted-foreground">Ke = </span>
            <span className="text-sm font-semibold text-primary">{result.costOfEquity.toFixed(2)}%</span>
          </div>
        </div>

        {/* Cost of Debt */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <span className="text-sm font-semibold text-foreground">Custo da Dívida (Kd)</span>
          </div>
          <div className="pl-3 space-y-2">
            {field('Custo Bruto da Dívida', 'Taxa média de juros pré-imposto sobre a dívida.', kd, setKd)}
            {field('Alíquota IR para Dívida', 'Taxa marginal de IR aplicada ao benefício fiscal.', taxDebt, setTaxDebt)}
          </div>
          <div className="pl-3 py-1.5 px-3 bg-accent/5 rounded-md">
            <span className="text-xs text-muted-foreground">Kd (pós IR) = </span>
            <span className="text-sm font-semibold text-accent">{result.costOfDebtAfterTax.toFixed(2)}%</span>
          </div>
        </div>

        {/* Capital Structure */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Estrutura de Capital</span>
          </div>
          <div className="pl-3 space-y-2">
            {field('Valor do Equity (E)', 'Valor de mercado do equity (ou book value).', eqVal, setEqVal, '')}
            {field('Valor da Dívida (D)', 'Valor de mercado da dívida (ou book value).', debtVal, setDebtVal, '')}
          </div>
          <div className="pl-3 py-1.5 px-3 bg-muted/50 rounded-md flex justify-between text-xs text-muted-foreground">
            <span>Equity: {(result.equityWeight * 100).toFixed(1)}%</span>
            <span>Dívida: {(result.debtWeight * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* WACC Result */}
        <div className="w-full py-3 px-4 bg-primary/10 rounded-lg text-center">
          <span className="text-xs text-muted-foreground block">WACC</span>
          <span className="text-2xl font-bold text-primary">{result.wacc.toFixed(2)}%</span>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          <Button onClick={handleContinue} className="w-full gap-2">
            Continuar com WACC {result.wacc.toFixed(2)}%
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};
