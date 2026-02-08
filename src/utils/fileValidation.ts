import type { SpreadsheetData } from '@/types/spreadsheet';

// File validation constants
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_ROWS = 10_000;
export const MAX_COLUMNS = 100;

// Valid MIME types
const VALID_EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const VALID_CSV_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
];

const VALID_EXTENSIONS: Record<'excel' | 'csv', string[]> = {
  excel: ['xlsx', 'xls'],
  csv: ['csv'],
};

/**
 * Validate a File object before processing.
 * Checks size, extension, and MIME type.
 */
export function validateFile(
  file: File,
  type: 'excel' | 'csv',
): { valid: boolean; error?: string } {
  // Zero-length check
  if (file.size === 0) {
    return { valid: false, error: 'O arquivo está vazio. Por favor, selecione um arquivo válido.' };
  }

  // Size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB. Por favor, use um arquivo menor.`,
    };
  }

  // Extension
  const ext = file.name.toLowerCase().split('.').pop();
  if (!ext || !VALID_EXTENSIONS[type].includes(ext)) {
    return {
      valid: false,
      error: `Extensão de arquivo inválida. Esperado: ${VALID_EXTENSIONS[type].join(', ')}`,
    };
  }

  // MIME type (lenient — some browsers/OS misreport)
  const validTypes = type === 'excel' ? VALID_EXCEL_TYPES : VALID_CSV_TYPES;
  if (file.type && !validTypes.includes(file.type) && file.type !== 'application/octet-stream') {
    console.warn(`Unexpected MIME type: ${file.type} for file: ${file.name}`);
  }

  return { valid: true };
}

/**
 * Validate parsed spreadsheet data dimensions.
 */
export function validateSpreadsheetData(
  data: SpreadsheetData,
): { valid: boolean; error?: string } {
  if (data.rowCount > MAX_ROWS) {
    return {
      valid: false,
      error: `O arquivo contém muitas linhas (${data.rowCount}). Limite máximo: ${MAX_ROWS} linhas.`,
    };
  }
  if (data.colCount > MAX_COLUMNS) {
    return {
      valid: false,
      error: `O arquivo contém muitas colunas (${data.colCount}). Limite máximo: ${MAX_COLUMNS} colunas.`,
    };
  }
  return { valid: true };
}

/**
 * Validate tab-separated rows (used by DataImport CSV/Excel text flow).
 */
export function validateDataSize(
  rows: string[],
  maxCols: number = MAX_COLUMNS,
): { valid: boolean; error?: string } {
  if (rows.length > MAX_ROWS) {
    return {
      valid: false,
      error: `O arquivo contém muitas linhas (${rows.length}). Limite máximo: ${MAX_ROWS} linhas.`,
    };
  }
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cols = rows[i].split('\t').length;
    if (cols > maxCols) {
      return {
        valid: false,
        error: `O arquivo contém muitas colunas (${cols}). Limite máximo: ${maxCols} colunas.`,
      };
    }
  }
  return { valid: true };
}
