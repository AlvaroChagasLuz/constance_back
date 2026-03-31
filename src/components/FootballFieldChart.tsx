/**
 * Football Field Chart
 *
 * The most iconic visualization in investment banking valuation decks.
 * Shows horizontal bars representing the valuation range from each
 * methodology, allowing quick visual comparison.
 *
 * Each bar shows: low — midpoint — high
 * A vertical line marks the base-case equity value.
 *
 * Built with inline SVG for maximum control over IB-grade styling.
 */

import React, { useMemo } from 'react';
import type { ValuationResult, SensitivityMatrix } from '@/engine/types';
import { formatCompact } from '@/engine/format';

// ============================================================================
// Types
// ============================================================================

export interface FootballFieldBar {
  /** Methodology label (e.g., "DCF — Gordon Growth") */
  label: string;
  /** Short sublabel (e.g., "Perpetuidade") */
  sublabel?: string;
  /** Low end of the range */
  low: number;
  /** Midpoint / base case */
  mid: number;
  /** High end of the range */
  high: number;
  /** Bar color */
  color: string;
  /** Lighter shade for the range fill */
  colorLight: string;
}

interface FootballFieldChartProps {
  /** The bars to display */
  bars: FootballFieldBar[];
  /** Currency for formatting */
  currency?: string;
  /** Height of the chart area */
  height?: number;
}

// ============================================================================
// Helper: derive bars from valuation results
// ============================================================================

export function buildFootballFieldBars(
  result: ValuationResult,
  sensitivityGrowth: SensitivityMatrix | null,
  sensitivityMultiple: SensitivityMatrix | null,
  currency: string = 'BRL'
): FootballFieldBar[] {
  const bars: FootballFieldBar[] = [];

  // Bar 1: DCF — Gordon Growth (derived from sensitivity table)
  if (result.equityValueGordon !== null && sensitivityGrowth) {
    const allValues = sensitivityGrowth.matrix.flat().filter(v => v > 0);
    const low = allValues.length > 0 ? Math.min(...allValues) : result.equityValueGordon * 0.8;
    const high = allValues.length > 0 ? Math.max(...allValues) : result.equityValueGordon * 1.2;

    bars.push({
      label: 'DCF — Gordon Growth',
      sublabel: 'Perpetuidade',
      low,
      mid: result.equityValueGordon,
      high,
      color: '#2563EB',     // blue-600
      colorLight: '#DBEAFE', // blue-100
    });
  }

  // Bar 2: DCF — Exit Multiple (derived from sensitivity table)
  if (result.equityValueExitMultiple !== null && sensitivityMultiple) {
    const allValues = sensitivityMultiple.matrix.flat().filter(v => v > 0);
    const low = allValues.length > 0 ? Math.min(...allValues) : result.equityValueExitMultiple * 0.8;
    const high = allValues.length > 0 ? Math.max(...allValues) : result.equityValueExitMultiple * 1.2;

    bars.push({
      label: 'DCF — Exit Multiple',
      sublabel: 'EV/EBITDA',
      low,
      mid: result.equityValueExitMultiple,
      high,
      color: '#D97706',     // amber-600
      colorLight: '#FEF3C7', // amber-100
    });
  }

  // Bar 3: DCF Combined range (if both methods available)
  if (result.equityValueGordon !== null && result.equityValueExitMultiple !== null) {
    const allGordon = sensitivityGrowth?.matrix.flat().filter(v => v > 0) ?? [];
    const allMultiple = sensitivityMultiple?.matrix.flat().filter(v => v > 0) ?? [];
    const allValues = [...allGordon, ...allMultiple];

    if (allValues.length > 0) {
      // Use 25th percentile and 75th percentile for a tighter "implied" range
      const sorted = [...allValues].sort((a, b) => a - b);
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      const midAvg = (result.equityValueGordon + result.equityValueExitMultiple) / 2;

      bars.push({
        label: 'DCF Combinado',
        sublabel: 'P25 – P75',
        low: p25,
        mid: midAvg,
        high: p75,
        color: '#059669',     // green-600
        colorLight: '#D1FAE5', // green-100
      });
    }
  }

  return bars;
}

// ============================================================================
// Chart Component
// ============================================================================

export const FootballFieldChart: React.FC<FootballFieldChartProps> = ({
  bars,
  currency = 'BRL',
  height: requestedHeight,
}) => {
  const config = useMemo(() => {
    if (bars.length === 0) return null;

    const barHeight = 36;
    const barGap = 28;
    const labelAreaWidth = 160;
    const rightPadding = 16;
    const topPadding = 32;
    const bottomPadding = 48;
    const chartWidth = 680;

    const totalBarArea = bars.length * barHeight + (bars.length - 1) * barGap;
    const svgHeight = requestedHeight ?? (topPadding + totalBarArea + bottomPadding);
    const plotWidth = chartWidth - labelAreaWidth - rightPadding;

    // Scale: find global min and max
    const allLows = bars.map(b => b.low);
    const allHighs = bars.map(b => b.high);
    const globalMin = Math.min(...allLows) * 0.85;
    const globalMax = Math.max(...allHighs) * 1.1;
    const range = globalMax - globalMin;

    const xScale = (val: number) => labelAreaWidth + ((val - globalMin) / range) * plotWidth;

    // Tick marks
    const nTicks = 6;
    const tickStep = range / nTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(tickStep)));
    const roundedStep = Math.ceil(tickStep / magnitude) * magnitude;
    const firstTick = Math.ceil(globalMin / roundedStep) * roundedStep;
    const ticks: number[] = [];
    for (let t = firstTick; t <= globalMax; t += roundedStep) {
      ticks.push(t);
    }

    return { barHeight, barGap, labelAreaWidth, topPadding, svgHeight, chartWidth, plotWidth, globalMin, globalMax, xScale, ticks };
  }, [bars, requestedHeight]);

  if (!config || bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        Nenhum dado de valuation disponível
      </div>
    );
  }

  const { barHeight, barGap, labelAreaWidth, topPadding, svgHeight, chartWidth, xScale, ticks } = config;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        className="select-none"
      >
        {/* Grid lines */}
        {ticks.map((t, i) => {
          const x = xScale(t);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={x} y1={topPadding - 8}
                x2={x} y2={svgHeight - 20}
                stroke="var(--color-border-tertiary)"
                strokeWidth="0.5"
                strokeDasharray="3 3"
              />
              <text
                x={x}
                y={svgHeight - 8}
                textAnchor="middle"
                fill="var(--color-text-tertiary)"
                fontSize="9"
                fontFamily="var(--font-sans)"
              >
                {formatCompact(t, currency)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => {
          const y = topPadding + i * (barHeight + barGap);
          const xLow = xScale(bar.low);
          const xHigh = xScale(bar.high);
          const xMid = xScale(bar.mid);
          const barW = xHigh - xLow;

          return (
            <g key={`bar-${i}`}>
              {/* Label (left side) */}
              <text
                x={labelAreaWidth - 12}
                y={y + barHeight / 2 - 5}
                textAnchor="end"
                fill="var(--color-text-primary)"
                fontSize="11"
                fontWeight="500"
                fontFamily="var(--font-sans)"
              >
                {bar.label}
              </text>
              {bar.sublabel && (
                <text
                  x={labelAreaWidth - 12}
                  y={y + barHeight / 2 + 9}
                  textAnchor="end"
                  fill="var(--color-text-tertiary)"
                  fontSize="9"
                  fontFamily="var(--font-sans)"
                >
                  {bar.sublabel}
                </text>
              )}

              {/* Range bar (light fill) */}
              <rect
                x={xLow}
                y={y + 4}
                width={Math.max(barW, 2)}
                height={barHeight - 8}
                rx={4}
                fill={bar.colorLight}
                stroke={bar.color}
                strokeWidth="1"
                opacity="0.9"
              />

              {/* Mid-point diamond marker */}
              <polygon
                points={`${xMid},${y + 4} ${xMid + 7},${y + barHeight / 2} ${xMid},${y + barHeight - 4} ${xMid - 7},${y + barHeight / 2}`}
                fill={bar.color}
                opacity="0.9"
              />

              {/* Low label */}
              <text
                x={xLow - 4}
                y={y + barHeight / 2 + 3}
                textAnchor="end"
                fill={bar.color}
                fontSize="8"
                fontWeight="500"
                fontFamily="var(--font-sans)"
              >
                {formatCompact(bar.low, currency)}
              </text>

              {/* High label */}
              <text
                x={xHigh + 4}
                y={y + barHeight / 2 + 3}
                textAnchor="start"
                fill={bar.color}
                fontSize="8"
                fontWeight="500"
                fontFamily="var(--font-sans)"
              >
                {formatCompact(bar.high, currency)}
              </text>

              {/* Mid label (above diamond) */}
              <text
                x={xMid}
                y={y - 2}
                textAnchor="middle"
                fill={bar.color}
                fontSize="10"
                fontWeight="600"
                fontFamily="var(--font-sans)"
              >
                {formatCompact(bar.mid, currency)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
