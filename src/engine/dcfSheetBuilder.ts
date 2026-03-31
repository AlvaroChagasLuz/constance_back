/**
 * Constance — DCF Summary Sheet Builder
 *
 * Builds a professional, IB-grade DCF summary worksheet inside an ExcelJS
 * workbook.  The sheet contains:
 *
 *   1. Header with valuation metadata
 *   2. Free Cash Flow projection table
 *   3. WACC breakdown
 *   4. Terminal Value (Gordon Growth + Exit Multiple)
 *   5. Enterprise Value → Equity Value bridge
 *   6. Implied Equity Value per share
 *   7. WACC × Perpetuity Growth sensitivity table
 *   8. WACC × Exit Multiple sensitivity table
 *
 * All numbers are formatted with Brazilian locale.  The sheet is fully
 * self-contained — an analyst can hand it to a client as-is.
 */

import ExcelJS from 'exceljs';
import type {
  ProjectedYear,
  WACCResult,
  WACCParameters,
  TerminalValueParameters,
  EquityBridgeParameters,
  ValuationResult,
  SensitivityMatrix,
  FCFAssumptions,
  IncomeStatementAssumptions,
} from '@/engine/types';

// ============================================================================
// Color palette (matches Constance branding)
// ============================================================================

const C = {
  darkNavy:  'FF0F172A',
  navy:      'FF1E293B',
  slate:     'FF334155',
  slateLight:'FF64748B',
  grayBg:    'FFF1F5F9',
  grayBorder:'FFE2E8F0',
  white:     'FFFFFFFF',
  green:     'FF059669',
  greenLight:'FFD1FAE5',
  greenDark: 'FF065F46',
  blue:      'FF2563EB',
  blueLight: 'FFDBEAFE',
  blueDark:  'FF1E40AF',
  amber:     'FFD97706',
  amberLight:'FFFEF3C7',
  red:       'FFDC2626',
  redLight:  'FFFEE2E2',
  purple:    'FF7C3AED',
  purpleLight:'FFEDE9FE',
};

// ============================================================================
// Style helpers
// ============================================================================

function applyTitleRow(ws: ExcelJS.Worksheet, row: number, text: string, lastCol: number) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: C.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.darkNavy } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.mergeCells(row, 1, row, lastCol);
  ws.getRow(row).height = 30;
}

function applySectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, lastCol: number, color = C.navy) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: C.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  for (let c = 2; c <= lastCol; c++) {
    ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    ws.getCell(row, c).font = { bold: true, size: 11, color: { argb: C.white } };
  }
  ws.getRow(row).height = 24;
}

function applySubHeader(ws: ExcelJS.Worksheet, row: number, values: (string | number)[], bgColor = C.grayBg) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 10, color: { argb: C.navy } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };
  });
}

function applyDataRow(ws: ExcelJS.Worksheet, row: number, values: (string | number | null)[], opts?: {
  bold?: boolean;
  numFmt?: string;
  highlight?: string;
  textColor?: string;
}) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v ?? '';
    cell.font = {
      bold: opts?.bold,
      size: 10,
      color: opts?.textColor ? { argb: opts.textColor } : { argb: C.slate },
    };
    if (i > 0 && opts?.numFmt) cell.numFmt = opts.numFmt;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    if (opts?.highlight) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.highlight } };
    }
    cell.border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };
  });
}

function applyHighlightRow(ws: ExcelJS.Worksheet, row: number, values: (string | number | null)[], bgColor: string, textColor: string, numFmt?: string) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v ?? '';
    cell.font = { bold: true, size: 11, color: { argb: textColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
    if (i > 0 && numFmt) cell.numFmt = numFmt;
  });
  ws.getRow(row).height = 24;
}

// ============================================================================
// Main builder
// ============================================================================

export interface DCFSheetData {
  projectedYears: ProjectedYear[];
  waccResult: WACCResult;
  waccParams: WACCParameters;
  tvParams: TerminalValueParameters;
  equityBridge: EquityBridgeParameters;
  valuationResult: ValuationResult;
  sensitivityGrowth: SensitivityMatrix | null;
  sensitivityMultiple: SensitivityMatrix | null;
  incomeStatement: IncomeStatementAssumptions;
  fcfAssumptions: FCFAssumptions;
  currency?: string;
}

export function buildDCFSheet(wb: ExcelJS.Workbook, data: DCFSheetData): ExcelJS.Worksheet {
  const ws = wb.addWorksheet('DCF Summary');
  const {
    projectedYears: years,
    waccResult,
    waccParams,
    tvParams,
    equityBridge,
    valuationResult,
    sensitivityGrowth,
    sensitivityMultiple,
    incomeStatement,
    fcfAssumptions,
  } = data;

  const nYears = years.length;
  const yearLabels = years.map(y => y.year);
  const lastCol = nYears + 2; // col 1 = label, col 2..n+1 = years, col n+2 = total/TV
  const numFmt = '#,##0';
  const pctFmt = '0.00%';

  // Column widths
  ws.getColumn(1).width = 34;
  for (let c = 2; c <= lastCol; c++) ws.getColumn(c).width = 16;

  let r = 1;

  // =========================================================================
  // 1. Title
  // =========================================================================
  applyTitleRow(ws, r, 'Constance — DCF Valuation Summary', lastCol);
  r += 1;

  // Date
  ws.getCell(r, 1).value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
  ws.getCell(r, 1).font = { size: 9, italic: true, color: { argb: C.slateLight } };
  r += 2;

  // =========================================================================
  // 2. Free Cash Flow Projection
  // =========================================================================
  applySectionHeader(ws, r, 'Projeção de Fluxo de Caixa Livre (FCFF)', lastCol, C.green);
  r += 1;

  applySubHeader(ws, r, ['', ...yearLabels, 'Total']);
  r += 1;

  // Income statement lines
  const isLines: { label: string; key: keyof ProjectedYear; bold?: boolean }[] = [
    { label: 'Receita Líquida', key: 'netRevenue' },
    { label: 'EBITDA', key: 'ebitda', bold: true },
    { label: 'EBIT', key: 'ebit' },
    { label: 'NOPAT', key: 'nopat', bold: true },
    { label: '(+) D&A', key: 'da' },
    { label: '(−) CapEx', key: 'capex' },
    { label: '(−) ΔWC', key: 'deltaWC' },
  ];

  for (const line of isLines) {
    const vals = years.map(y => y[line.key] as number);
    const total = vals.reduce((a, b) => a + b, 0);
    applyDataRow(ws, r, [line.label, ...vals, total], { bold: line.bold, numFmt });
    r += 1;
  }

  // FCFF (highlighted)
  const fcfVals = years.map(y => y.fcff);
  const fcfTotal = fcfVals.reduce((a, b) => a + b, 0);
  applyHighlightRow(ws, r, ['Free Cash Flow (FCFF)', ...fcfVals, fcfTotal], C.greenLight, C.greenDark, numFmt);
  r += 1;

  // Discount factors
  applyDataRow(ws, r, ['Fator de Desconto', ...years.map(y => y.discountFactor), ''], { numFmt: '0.0000' });
  r += 1;

  // PV of FCFs
  const pvVals = years.map(y => y.pvFCF);
  applyHighlightRow(ws, r, ['VP do FCFF', ...pvVals, valuationResult.pvOfFCFs], C.greenLight, C.greenDark, numFmt);
  r += 2;

  // =========================================================================
  // 3. WACC Breakdown
  // =========================================================================
  applySectionHeader(ws, r, 'WACC — Custo Médio Ponderado de Capital', lastCol, C.blue);
  r += 1;

  const waccLines: [string, string | number][] = [
    ['Taxa Livre de Risco (Rf)', `${waccParams.riskFreeRate}%`],
    ['Beta Alavancado (β)', waccParams.leveredBeta],
    ['Prêmio de Risco de Mercado (ERP)', `${waccParams.equityRiskPremium}%`],
    ['Prêmio de Tamanho', `${waccParams.sizePremium}%`],
    ['Risco País (CRP)', `${waccParams.countryRiskPremium}%`],
    ['Risco Específico', `${waccParams.companySpecificRisk}%`],
    ['Custo do Equity (Ke)', `${waccResult.costOfEquity.toFixed(2)}%`],
    ['', ''],
    ['Custo da Dívida pré-IR', `${waccParams.costOfDebt}%`],
    ['Alíquota IR (Dívida)', `${waccParams.taxRateForDebt}%`],
    ['Custo da Dívida pós-IR', `${waccResult.costOfDebtAfterTax.toFixed(2)}%`],
    ['', ''],
    ['Peso Equity', `${(waccResult.equityWeight * 100).toFixed(1)}%`],
    ['Peso Dívida', `${(waccResult.debtWeight * 100).toFixed(1)}%`],
  ];

  for (const [label, val] of waccLines) {
    if (label === '') { r += 1; continue; }
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 10, color: { argb: C.slate } };
    ws.getCell(r, 2).value = val;
    ws.getCell(r, 2).font = { size: 10, color: { argb: C.slate } };
    ws.getCell(r, 2).alignment = { horizontal: 'center' };
    ws.getCell(r, 1).border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };
    ws.getCell(r, 2).border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };
    r += 1;
  }

  // WACC result
  applyHighlightRow(ws, r, ['WACC', `${waccResult.wacc.toFixed(2)}%`, '', '', '', '', '', ''].slice(0, lastCol), C.blueLight, C.blueDark);
  r += 2;

  // =========================================================================
  // 4. Terminal Value
  // =========================================================================
  applySectionHeader(ws, r, 'Valor Terminal', lastCol, C.amber);
  r += 1;

  const lastYear = years[years.length - 1];
  if (valuationResult.terminalValue.gordonGrowth !== null) {
    applyDataRow(ws, r, ['Método: Gordon Growth Model', '', '', '', '', ''].slice(0, lastCol));
    r += 1;
    applyDataRow(ws, r, ['  FCF do último ano', lastYear?.fcff ?? 0].concat(new Array(lastCol - 2).fill('')), { numFmt });
    r += 1;
    applyDataRow(ws, r, ['  Taxa de Crescimento Perpétuo (g)', `${tvParams.perpetuityGrowthRate}%`].concat(new Array(lastCol - 2).fill('')));
    r += 1;
    applyDataRow(ws, r, ['  TV (nominal)', valuationResult.terminalValue.gordonGrowth].concat(new Array(lastCol - 2).fill('')), { numFmt, bold: true });
    r += 1;
    applyDataRow(ws, r, ['  VP do TV', valuationResult.terminalValue.pvGordonGrowth].concat(new Array(lastCol - 2).fill('')), { numFmt, bold: true, highlight: C.amberLight });
    r += 1;
  }

  if (valuationResult.terminalValue.exitMultiple !== null) {
    r += 1;
    applyDataRow(ws, r, ['Método: Múltiplo de Saída', '', '', '', '', ''].slice(0, lastCol));
    r += 1;
    applyDataRow(ws, r, ['  EBITDA do último ano', lastYear?.ebitda ?? 0].concat(new Array(lastCol - 2).fill('')), { numFmt });
    r += 1;
    applyDataRow(ws, r, ['  Múltiplo EV/EBITDA', `${tvParams.exitMultiple}x`].concat(new Array(lastCol - 2).fill('')));
    r += 1;
    applyDataRow(ws, r, ['  TV (nominal)', valuationResult.terminalValue.exitMultiple].concat(new Array(lastCol - 2).fill('')), { numFmt, bold: true });
    r += 1;
    applyDataRow(ws, r, ['  VP do TV', valuationResult.terminalValue.pvExitMultiple].concat(new Array(lastCol - 2).fill('')), { numFmt, bold: true, highlight: C.amberLight });
    r += 1;
  }
  r += 1;

  // =========================================================================
  // 5. Enterprise Value → Equity Value Bridge
  // =========================================================================
  applySectionHeader(ws, r, 'Enterprise Value → Equity Value', lastCol, C.purple);
  r += 1;

  const bridgeLines: [string, number | null, string?][] = [];

  if (valuationResult.enterpriseValueGordon !== null) {
    bridgeLines.push(['VP dos FCFs', valuationResult.pvOfFCFs]);
    bridgeLines.push(['VP do Terminal Value (Gordon)', valuationResult.terminalValue.pvGordonGrowth]);
    bridgeLines.push(['Enterprise Value (Gordon)', valuationResult.enterpriseValueGordon]);
    bridgeLines.push(['(−) Dívida Total', -equityBridge.totalDebt]);
    bridgeLines.push(['(+) Caixa e Equivalentes', equityBridge.cashAndEquivalents]);
    if (equityBridge.nonOperatingAssets) bridgeLines.push(['(+) Ativos Não-Operacionais', equityBridge.nonOperatingAssets]);
    if (equityBridge.minorityInterest) bridgeLines.push(['(−) Participação Minoritária', -equityBridge.minorityInterest]);
    bridgeLines.push(['EQUITY VALUE (Gordon)', valuationResult.equityValueGordon, 'highlight']);
    if (equityBridge.sharesOutstanding > 1) {
      bridgeLines.push(['Ações em Circulação', equityBridge.sharesOutstanding]);
      bridgeLines.push(['Preço por Ação (Gordon)', valuationResult.pricePerShareGordon, 'highlight']);
    }
  }

  if (valuationResult.enterpriseValueExitMultiple !== null) {
    bridgeLines.push(['', null]);
    bridgeLines.push(['VP dos FCFs', valuationResult.pvOfFCFs]);
    bridgeLines.push(['VP do Terminal Value (Exit Multiple)', valuationResult.terminalValue.pvExitMultiple]);
    bridgeLines.push(['Enterprise Value (Exit Multiple)', valuationResult.enterpriseValueExitMultiple]);
    bridgeLines.push(['(−) Dívida Total', -equityBridge.totalDebt]);
    bridgeLines.push(['(+) Caixa e Equivalentes', equityBridge.cashAndEquivalents]);
    if (equityBridge.nonOperatingAssets) bridgeLines.push(['(+) Ativos Não-Operacionais', equityBridge.nonOperatingAssets]);
    if (equityBridge.minorityInterest) bridgeLines.push(['(−) Participação Minoritária', -equityBridge.minorityInterest]);
    bridgeLines.push(['EQUITY VALUE (Exit Multiple)', valuationResult.equityValueExitMultiple, 'highlight']);
    if (equityBridge.sharesOutstanding > 1) {
      bridgeLines.push(['Ações em Circulação', equityBridge.sharesOutstanding]);
      bridgeLines.push(['Preço por Ação (Exit Multiple)', valuationResult.pricePerShareExitMultiple, 'highlight']);
    }
  }

  for (const [label, val, style] of bridgeLines) {
    if (label === '' && val === null) { r += 1; continue; }
    if (style === 'highlight') {
      applyHighlightRow(ws, r, [label, val, '', '', '', '', '', ''].slice(0, lastCol), C.purpleLight, C.purple, numFmt);
    } else {
      applyDataRow(ws, r, [label, val, '', '', '', '', '', ''].slice(0, lastCol), { numFmt });
    }
    r += 1;
  }

  if (valuationResult.tvAsPercentOfEVGordon !== null) {
    r += 1;
    applyDataRow(ws, r, ['TV como % do EV (Gordon)', `${valuationResult.tvAsPercentOfEVGordon.toFixed(1)}%`].concat(new Array(lastCol - 2).fill('')));
    r += 1;
  }
  if (valuationResult.tvAsPercentOfEVExitMultiple !== null) {
    applyDataRow(ws, r, ['TV como % do EV (Exit Multiple)', `${valuationResult.tvAsPercentOfEVExitMultiple.toFixed(1)}%`].concat(new Array(lastCol - 2).fill('')));
    r += 1;
  }

  r += 1;

  // =========================================================================
  // 6. Sensitivity Table — WACC × Perpetuity Growth
  // =========================================================================
  if (sensitivityGrowth) {
    applySectionHeader(ws, r, 'Sensibilidade: WACC × Crescimento Perpétuo (Equity Value)', sensitivityGrowth.colValues.length + 1, C.navy);
    r += 1;

    // Column headers (growth rates)
    const hdrRow = ['WACC \\ g', ...sensitivityGrowth.colValues.map(g => `${g.toFixed(1)}%`)];
    applySubHeader(ws, r, hdrRow);
    // Highlight base case column header
    const baseColCell = ws.getCell(r, sensitivityGrowth.baseColIndex + 2);
    baseColCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blueLight } };
    baseColCell.font = { bold: true, size: 10, color: { argb: C.blueDark } };
    r += 1;

    sensitivityGrowth.rowValues.forEach((wacc, i) => {
      const isBaseRow = i === sensitivityGrowth.baseRowIndex;
      const rowVals: (string | number)[] = [`${wacc.toFixed(1)}%`, ...sensitivityGrowth.matrix[i]];
      rowVals.forEach((v, j) => {
        const cell = ws.getCell(r, j + 1);
        cell.value = v;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = j > 0 ? numFmt : undefined;
        cell.font = { size: 9, color: { argb: C.slate } };
        cell.border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };

        const isBaseCol = j - 1 === sensitivityGrowth.baseColIndex;
        if (isBaseRow && isBaseCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blueLight } };
          cell.font = { bold: true, size: 10, color: { argb: C.blueDark } };
        } else if (isBaseRow) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grayBg } };
          cell.font = { bold: true, size: 9, color: { argb: C.navy } };
        } else if (isBaseCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grayBg } };
        }

        // Red if negative
        if (typeof v === 'number' && v < 0) {
          cell.font = { ...cell.font, color: { argb: C.red } };
        }
      });
      r += 1;
    });
    r += 1;
  }

  // =========================================================================
  // 7. Sensitivity Table — WACC × Exit Multiple
  // =========================================================================
  if (sensitivityMultiple) {
    applySectionHeader(ws, r, 'Sensibilidade: WACC × Múltiplo de Saída (Equity Value)', sensitivityMultiple.colValues.length + 1, C.navy);
    r += 1;

    const hdrRow = ['WACC \\ EV/EBITDA', ...sensitivityMultiple.colValues.map(m => `${m.toFixed(1)}x`)];
    applySubHeader(ws, r, hdrRow);
    const baseColCell = ws.getCell(r, sensitivityMultiple.baseColIndex + 2);
    baseColCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.amberLight } };
    baseColCell.font = { bold: true, size: 10, color: { argb: C.amber } };
    r += 1;

    sensitivityMultiple.rowValues.forEach((wacc, i) => {
      const isBaseRow = i === sensitivityMultiple.baseRowIndex;
      const rowVals: (string | number)[] = [`${wacc.toFixed(1)}%`, ...sensitivityMultiple.matrix[i]];
      rowVals.forEach((v, j) => {
        const cell = ws.getCell(r, j + 1);
        cell.value = v;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = j > 0 ? numFmt : undefined;
        cell.font = { size: 9, color: { argb: C.slate } };
        cell.border = { bottom: { style: 'thin', color: { argb: C.grayBorder } } };

        const isBaseCol = j - 1 === sensitivityMultiple.baseColIndex;
        if (isBaseRow && isBaseCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.amberLight } };
          cell.font = { bold: true, size: 10, color: { argb: C.amber } };
        } else if (isBaseRow) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grayBg } };
          cell.font = { bold: true, size: 9, color: { argb: C.navy } };
        } else if (isBaseCol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grayBg } };
        }

        if (typeof v === 'number' && v < 0) {
          cell.font = { ...cell.font, color: { argb: C.red } };
        }
      });
      r += 1;
    });
  }

  // Freeze header
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 0 }];

  return ws;
}
