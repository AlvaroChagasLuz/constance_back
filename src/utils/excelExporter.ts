import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DREData, ProjectionPremises, CATEGORY_LABELS } from '@/types/dre';

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

export async function generateExcel(
  dreData: DREData,
  premises: ProjectionPremises
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRE Valuation App';
  workbook.created = new Date();

  // Sheet 1: DRE Histórico
  const historicoSheet = workbook.addWorksheet('DRE_Historico');
  createHistoricoSheet(historicoSheet, dreData);

  // Sheet 2: Premissas
  const premissasSheet = workbook.addWorksheet('Premissas');
  const premissasRefs = createPremissasSheet(premissasSheet, premises, dreData.periods);

  // Sheet 3: DRE Projeção
  const projecaoSheet = workbook.addWorksheet('DRE_Projecao');
  createProjecaoSheet(projecaoSheet, dreData, premises, premissasRefs);

  // Sheet 4: Resumo
  const resumoSheet = workbook.addWorksheet('Resumo');
  createResumoSheet(resumoSheet, dreData, premises);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `DRE_Projecao_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function createHistoricoSheet(sheet: ExcelJS.Worksheet, dreData: DREData) {
  // Header row
  const headerRow = ['Conta', ...dreData.periods];
  sheet.addRow(headerRow);

  // Style header
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  header.alignment = { horizontal: 'center' };

  // Data rows
  dreData.rows.forEach((row) => {
    const values = [row.account, ...dreData.periods.map(p => row.values[p] || 0)];
    const excelRow = sheet.addRow(values);

    // Format numbers as currency
    for (let i = 2; i <= values.length; i++) {
      const cell = excelRow.getCell(i);
      cell.numFmt = '#,##0';
      if ((cell.value as number) < 0) {
        cell.font = { color: { argb: 'FFDC2626' } };
      }
    }
  });

  // Auto-width columns
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 35 : 15;
  });

  // Freeze first row and column
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

interface PremissasRefs {
  revenueGrowth: string;
  cogsPercent: string;
  sgaPercent: string;
  depreciationPercent: string;
  taxRate: string;
}

function createPremissasSheet(
  sheet: ExcelJS.Worksheet,
  premises: ProjectionPremises,
  periods: string[]
): PremissasRefs {
  // Title
  sheet.addRow(['PREMISSAS DE PROJEÇÃO']);
  sheet.mergeCells('A1:B1');
  const titleCell = sheet.getCell('A1');
  titleCell.font = { bold: true, size: 14 };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };

  sheet.addRow([]);

  // General
  sheet.addRow(['Premissas Gerais']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  sheet.addRow(['Anos de Projeção', premises.projectionYears]);
  sheet.addRow(['Ano Base', premises.baseYear || periods[periods.length - 1]]);
  sheet.addRow(['Moeda', premises.currency]);

  sheet.addRow([]);

  // Revenue
  sheet.addRow(['Receita']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  const revenueGrowthRow = sheet.rowCount + 1;
  sheet.addRow(['Taxa de Crescimento (%)', premises.revenueGrowthRate / 100]);
  sheet.getCell(`B${revenueGrowthRow}`).numFmt = '0.0%';

  sheet.addRow([]);

  // Costs
  sheet.addRow(['Custos']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  const cogsRow = sheet.rowCount + 1;
  sheet.addRow(['COGS (% da Receita)', premises.cogsPercent / 100]);
  sheet.getCell(`B${cogsRow}`).numFmt = '0.0%';

  sheet.addRow([]);

  // Operating Expenses
  sheet.addRow(['Despesas Operacionais']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  const sgaRow = sheet.rowCount + 1;
  sheet.addRow(['SG&A (% da Receita)', premises.sgaPercent / 100]);
  sheet.getCell(`B${sgaRow}`).numFmt = '0.0%';

  sheet.addRow([]);

  // Depreciation
  sheet.addRow(['Depreciação']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  const deprecRow = sheet.rowCount + 1;
  sheet.addRow(['Depreciação (% da Receita)', premises.depreciationPercent / 100]);
  sheet.getCell(`B${deprecRow}`).numFmt = '0.0%';

  sheet.addRow([]);

  // Taxes
  sheet.addRow(['Impostos']);
  sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
  const taxRow = sheet.rowCount + 1;
  sheet.addRow(['Alíquota Efetiva (%)', premises.taxRate / 100]);
  sheet.getCell(`B${taxRow}`).numFmt = '0.0%';

  // Column widths
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 15;

  return {
    revenueGrowth: `Premissas!$B$${revenueGrowthRow}`,
    cogsPercent: `Premissas!$B$${cogsRow}`,
    sgaPercent: `Premissas!$B$${sgaRow}`,
    depreciationPercent: `Premissas!$B$${deprecRow}`,
    taxRate: `Premissas!$B$${taxRow}`,
  };
}

function createProjecaoSheet(
  sheet: ExcelJS.Worksheet,
  dreData: DREData,
  premises: ProjectionPremises,
  premissasRefs: PremissasRefs
) {
  const baseYear = premises.baseYear || dreData.periods[dreData.periods.length - 1];
  const baseYearNum = parseInt(baseYear);
  const projectedYears: string[] = [];
  
  for (let i = 1; i <= premises.projectionYears; i++) {
    projectedYears.push((baseYearNum + i).toString());
  }

  // Also include historical data for reference
  const allPeriods = [...dreData.periods, ...projectedYears];

  // Header row
  const headerRow = ['Conta', ...allPeriods];
  sheet.addRow(headerRow);

  // Style header
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  header.alignment = { horizontal: 'center' };

  // Find key rows for formulas
  let receitaLiquidaRow = -1;
  let lucroRow = -1;
  let ebitdaRow = -1;
  let ebitRow = -1;

  dreData.rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row
    
    if (row.category === 'receita_liquida') receitaLiquidaRow = rowNum;
    if (row.category === 'lucro_bruto') lucroRow = rowNum;
    if (row.category === 'ebitda') ebitdaRow = rowNum;
    if (row.category === 'ebit') ebitRow = rowNum;
  });

  // Data rows with formulas
  dreData.rows.forEach((row, rowIndex) => {
    const excelRowNum = rowIndex + 2;
    const values: (string | number)[] = [row.account];

    // Historical values
    dreData.periods.forEach(period => {
      values.push(row.values[period] || 0);
    });

    const dataRow = sheet.addRow(values);

    // Add formulas for projected years
    projectedYears.forEach((year, yearIndex) => {
      const colIndex = dreData.periods.length + yearIndex + 2; // +2 for account column and 1-indexing
      const colLetter = getColumnLetter(colIndex - 1);
      const prevColLetter = getColumnLetter(colIndex - 2);
      const cell = dataRow.getCell(colIndex);

      // Create formulas based on category
      switch (row.category) {
        case 'receita_liquida':
        case 'receita_bruta':
          // Revenue = Previous * (1 + growth rate)
          cell.value = { formula: `${prevColLetter}${excelRowNum}*(1+${premissasRefs.revenueGrowth})` };
          break;
        case 'cogs':
          // COGS = -Revenue * COGS%
          if (receitaLiquidaRow > 0) {
            cell.value = { formula: `-${colLetter}${receitaLiquidaRow}*${premissasRefs.cogsPercent}` };
          }
          break;
        case 'despesas_operacionais':
          // SG&A = -Revenue * SG&A%
          if (receitaLiquidaRow > 0) {
            cell.value = { formula: `-${colLetter}${receitaLiquidaRow}*${premissasRefs.sgaPercent}` };
          }
          break;
        case 'depreciacao':
          // Depreciation = -Revenue * Depreciation%
          if (receitaLiquidaRow > 0) {
            cell.value = { formula: `-${colLetter}${receitaLiquidaRow}*${premissasRefs.depreciationPercent}` };
          }
          break;
        case 'lucro_bruto':
          // Gross Profit = Revenue + COGS
          if (receitaLiquidaRow > 0) {
            // Sum from receita_liquida to the row before lucro_bruto
            const startRow = receitaLiquidaRow;
            const endRow = excelRowNum - 1;
            cell.value = { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
          }
          break;
        case 'ebitda':
          // EBITDA calculation
          if (lucroRow > 0) {
            const startRow = lucroRow;
            const endRow = excelRowNum - 1;
            cell.value = { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
          }
          break;
        case 'ebit':
          // EBIT = EBITDA + Depreciation
          if (ebitdaRow > 0) {
            const startRow = ebitdaRow;
            const endRow = excelRowNum - 1;
            cell.value = { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
          }
          break;
        case 'imposto':
          // Tax = -EBIT * Tax Rate
          if (ebitRow > 0) {
            cell.value = { formula: `-${colLetter}${ebitRow}*${premissasRefs.taxRate}` };
          }
          break;
        case 'lucro_liquido':
          // Net Income = EBIT + Tax
          if (ebitRow > 0) {
            const startRow = ebitRow;
            const endRow = excelRowNum - 1;
            cell.value = { formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` };
          }
          break;
        default:
          // For other rows, apply same growth rate as revenue
          cell.value = { formula: `${prevColLetter}${excelRowNum}*(1+${premissasRefs.revenueGrowth})` };
      }

      cell.numFmt = '#,##0';
    });

    // Format all number cells
    for (let i = 2; i <= allPeriods.length + 1; i++) {
      const cell = dataRow.getCell(i);
      cell.numFmt = '#,##0';
    }
  });

  // Highlight projected columns
  for (let col = dreData.periods.length + 2; col <= allPeriods.length + 1; col++) {
    for (let row = 1; row <= dreData.rows.length + 1; row++) {
      const cell = sheet.getCell(row, col);
      if (row === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF059669' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' },
        };
      }
    }
  }

  // Auto-width columns
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 35 : 15;
  });

  // Freeze first row and column
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

function createResumoSheet(
  sheet: ExcelJS.Worksheet,
  dreData: DREData,
  premises: ProjectionPremises
) {
  const baseYear = premises.baseYear || dreData.periods[dreData.periods.length - 1];
  const baseYearNum = parseInt(baseYear);
  const projectedYears: string[] = [];
  
  for (let i = 1; i <= premises.projectionYears; i++) {
    projectedYears.push((baseYearNum + i).toString());
  }

  const allPeriods = [...dreData.periods, ...projectedYears];

  // Title
  sheet.addRow(['RESUMO DO VALUATION']);
  sheet.mergeCells(`A1:${getColumnLetter(allPeriods.length)}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  titleCell.alignment = { horizontal: 'center' };

  sheet.addRow([]);

  // KPIs
  const kpis = ['Receita Líquida', 'EBITDA', 'Margem EBITDA (%)', 'Lucro Líquido'];
  
  // Header
  sheet.addRow(['Indicador', ...allPeriods]);
  const headerRow = sheet.getRow(3);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  // Find key values
  const receitaRow = dreData.rows.find(r => r.category === 'receita_liquida');
  const ebitdaRow = dreData.rows.find(r => r.category === 'ebitda');
  const lucroRow = dreData.rows.find(r => r.category === 'lucro_liquido');

  // Receita
  const receitaValues = allPeriods.map((p, i) => {
    if (i < dreData.periods.length && receitaRow) {
      return receitaRow.values[p] || 0;
    }
    // Projected
    const lastHistorical = receitaRow?.values[dreData.periods[dreData.periods.length - 1]] || 0;
    return lastHistorical * Math.pow(1 + premises.revenueGrowthRate / 100, i - dreData.periods.length + 1);
  });
  sheet.addRow(['Receita Líquida', ...receitaValues]);

  // EBITDA
  const ebitdaValues = allPeriods.map((p, i) => {
    if (i < dreData.periods.length && ebitdaRow) {
      return ebitdaRow.values[p] || 0;
    }
    // Simplified projection
    const revenue = receitaValues[i];
    const cogs = revenue * (premises.cogsPercent / 100);
    const sga = revenue * (premises.sgaPercent / 100);
    return revenue - cogs - sga;
  });
  sheet.addRow(['EBITDA', ...ebitdaValues]);

  // Margem EBITDA
  const margemValues = allPeriods.map((_, i) => {
    return receitaValues[i] > 0 ? ebitdaValues[i] / receitaValues[i] : 0;
  });
  const margemRow = sheet.addRow(['Margem EBITDA', ...margemValues]);
  for (let i = 2; i <= allPeriods.length + 1; i++) {
    margemRow.getCell(i).numFmt = '0.0%';
  }

  // Lucro Líquido
  const lucroValues = allPeriods.map((p, i) => {
    if (i < dreData.periods.length && lucroRow) {
      return lucroRow.values[p] || 0;
    }
    // Simplified projection
    const revenue = receitaValues[i];
    const depreciation = revenue * (premises.depreciationPercent / 100);
    const ebit = ebitdaValues[i] - depreciation;
    const tax = ebit * (premises.taxRate / 100);
    return ebit - tax;
  });
  sheet.addRow(['Lucro Líquido', ...lucroValues]);

  // Format currency cells
  [4, 5, 7].forEach(rowNum => {
    const row = sheet.getRow(rowNum);
    for (let i = 2; i <= allPeriods.length + 1; i++) {
      row.getCell(i).numFmt = '#,##0';
    }
  });

  // Column widths
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 20 : 15;
  });
}
