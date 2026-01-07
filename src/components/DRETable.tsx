import React from 'react';
import { DREData, CATEGORY_LABELS, DRECategory } from '@/types/dre';
import { formatCurrency } from '@/utils/dreParser';
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DRETableProps {
  dreData: DREData | null;
  onUpdateRow?: (rowId: string, updates: Partial<{ account: string; values: Record<string, number> }>) => void;
}

export const DRETable: React.FC<DRETableProps> = ({ dreData, onUpdateRow }) => {
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<DRECategory>>(new Set());
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; period?: string } | null>(null);
  const [editValue, setEditValue] = React.useState('');

  if (!dreData || dreData.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <p className="text-sm font-medium">Nenhuma DRE importada</p>
        <p className="text-xs mt-1">Cole, faça upload ou carregue um exemplo</p>
      </div>
    );
  }

  const toggleCategory = (category: DRECategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const startEditing = (rowId: string, period?: string, currentValue?: string | number) => {
    setEditingCell({ rowId, period });
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = (rowId: string, period?: string) => {
    if (onUpdateRow) {
      if (period) {
        const numValue = parseFloat(editValue.replace(/[^\d.-]/g, '')) || 0;
        const row = dreData.rows.find(r => r.id === rowId);
        if (row) {
          onUpdateRow(rowId, { values: { ...row.values, [period]: numValue } });
        }
      } else {
        onUpdateRow(rowId, { account: editValue });
      }
    }
    cancelEditing();
  };

  // Group rows by category for potential collapse
  let currentCategory: DRECategory | null = null;

  return (
    <div className="overflow-auto h-full animate-fade-in">
      <table className="w-full border-collapse font-mono text-sm">
        <thead className="excel-header">
          <tr>
            <th className="excel-cell text-left min-w-[200px] sticky left-0 z-20 bg-table-header">
              Conta
            </th>
            {dreData.periods.map((period) => (
              <th key={period} className="excel-cell text-right min-w-[120px]">
                {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dreData.rows.map((row, index) => {
            const isNewCategory = row.category !== currentCategory;
            currentCategory = row.category;
            const isCollapsed = collapsedCategories.has(row.category);
            const isSubtotalRow = ['receita_liquida', 'lucro_bruto', 'ebitda', 'ebit', 'lucro_liquido'].includes(row.category);

            return (
              <React.Fragment key={row.id}>
                {isNewCategory && (
                  <tr className="bg-secondary/50">
                    <td
                      colSpan={dreData.periods.length + 1}
                      className="excel-cell text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-secondary/70 transition-colors"
                      onClick={() => toggleCategory(row.category)}
                    >
                      <span className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {CATEGORY_LABELS[row.category]}
                      </span>
                    </td>
                  </tr>
                )}
                {!isCollapsed && (
                  <tr
                    className={cn(
                      'hover:bg-accent/20 transition-colors group',
                      index % 2 === 0 && 'excel-row-alt',
                      isSubtotalRow && 'font-semibold bg-secondary/30'
                    )}
                  >
                    <td className="excel-cell sticky left-0 z-10 bg-inherit">
                      <div className="flex items-center gap-2">
                        {editingCell?.rowId === row.id && !editingCell.period ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-1 py-0.5 border rounded text-sm w-full bg-background"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(row.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <button onClick={() => saveEdit(row.id)} className="text-success">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditing} className="text-destructive">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={cn(isSubtotalRow && 'text-primary')}>
                              {row.account}
                            </span>
                            <button
                              onClick={() => startEditing(row.id, undefined, row.account)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    {dreData.periods.map((period) => {
                      const value = row.values[period] || 0;
                      const isEditing = editingCell?.rowId === row.id && editingCell.period === period;

                      return (
                        <td
                          key={period}
                          className={cn(
                            'excel-cell text-right tabular-nums',
                            value < 0 && 'finance-negative',
                            value > 0 && 'finance-positive'
                          )}
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="px-1 py-0.5 border rounded text-sm w-24 text-right bg-background"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(row.id, period);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                              />
                            </div>
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onDoubleClick={() => startEditing(row.id, period, value)}
                            >
                              {formatCurrency(value)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
