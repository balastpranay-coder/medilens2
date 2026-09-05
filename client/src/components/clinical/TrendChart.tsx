import React, { useState, useEffect } from 'react';
import { LineChart as ChartIcon, Calendar, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TestTrend, TrendDataPoint } from '../../types';

interface Props {
  trends?: TestTrend[];
  patientId?: number;
  isLoading?: boolean;
}

export const TrendChart: React.FC<Props> = ({ trends: externalTrends, patientId, isLoading: externalLoading = false }) => {
  const { authFetch } = useAuth();
  const [internalTrends, setInternalTrends] = useState<TestTrend[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(Boolean(patientId && !externalTrends));
  const [selectedTestName, setSelectedTestName] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  useEffect(() => {
    if (patientId && !externalTrends) {
      setInternalLoading(true);
      authFetch(`/api/patients/${patientId}/trends`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to load trends'))
        .then(data => {
          const list: TestTrend[] = data.trends || [];
          setInternalTrends(list);
          if (list.length > 0) setSelectedTestName(list[0].test_name);
        })
        .catch(e => console.error(e))
        .finally(() => setInternalLoading(false));
    }
  }, [patientId, externalTrends]);

  const trends = externalTrends || internalTrends;
  const isLoading = externalLoading || internalLoading;

  useEffect(() => {
    if (trends.length > 0 && !selectedTestName) {
      setSelectedTestName(trends[0].test_name);
    }
  }, [trends]);

  // Default to first test if current selection is invalid
  const currentTrend = trends.find(t => t.test_name === selectedTestName) || trends[0] || null;

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p>Loading historical laboratory trends...</p>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
        <ChartIcon className="w-7 h-7 text-slate-400 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-800">No Historical Trends Available</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Upload and extract multiple laboratory reports for this patient to track measurements over time.
        </p>
      </div>
    );
  }

  // Filter numeric points
  const points = currentTrend ? currentTrend.data_points.filter(p => p.numeric_value !== null) : [];

  const hasEnoughData = points.length >= 2;

  // Chart coordinate calculations
  const width = 640;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  let minVal = 0;
  let maxVal = 100;
  let coords: { x: number; y: number; point: TrendDataPoint }[] = [];

  if (hasEnoughData) {
    const vals = points.map(p => p.numeric_value as number);
    minVal = Math.min(...vals);
    maxVal = Math.max(...vals);

    // Give 15% headroom
    const range = maxVal - minVal || 1;
    minVal = Math.max(0, minVal - range * 0.15);
    maxVal = maxVal + range * 0.15;

    coords = points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1)) * chartW;
      const val = p.numeric_value as number;
      const y = paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, point: p };
    });
  }

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      
      {/* Top Header & Test Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-blue-900" />
            Patient Longitudinal Trends
          </h2>
          <p className="text-[11px] text-slate-500">
            Factual measurement progression across chronological reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Test:</label>
          <select
            value={currentTrend?.test_name || ''}
            onChange={(e) => setSelectedTestName(e.target.value)}
            className="clinical-input py-1.5 px-2.5 text-xs font-medium min-w-[180px]"
          >
            {trends.map(t => (
              <option key={t.test_name} value={t.test_name}>
                {t.test_name} ({t.data_points.length} {t.data_points.length === 1 ? 'record' : 'records'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasEnoughData ? (
        <div className="py-12 px-4 text-center space-y-2 bg-slate-50 rounded-lg border border-slate-200">
          <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
          <h3 className="text-xs font-semibold text-slate-800">
            Not enough historical data for a trend.
          </h3>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            {currentTrend?.test_name} has only 1 recorded value ({points[0]?.raw_value} {currentTrend?.unit}) on {points[0]?.date}. At least 2 historical reports are required to render a longitudinal trend line.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto bg-slate-50/50 rounded-lg border border-slate-200 p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl mx-auto block">
              
              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + chartH * (1 - ratio);
                const val = minVal + (maxVal - minVal) * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#64748b"
                      fontFamily="monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Connecting Line */}
              <polyline
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Data points */}
              {coords.map((c, i) => {
                const isHovered = hoveredPoint?.result_id === c.point.result_id;
                return (
                  <g key={i}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isHovered ? 6 : 4.5}
                      fill="#ffffff"
                      stroke="#1e3a8a"
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(c.point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* X-axis date label */}
                    <text
                      x={c.x}
                      y={height - 15}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                    >
                      {c.point.date || `Rpt #${c.point.report_id}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active Data Point Inspection Card / Summary */}
          {hoveredPoint && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-md text-xs flex items-center justify-between gap-4 animate-in fade-in duration-100">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-900 block">
                  Report Date: {hoveredPoint.date}
                </span>
                <span className="font-semibold text-slate-900 text-xs">
                  {currentTrend?.test_name}: {hoveredPoint.raw_value} {hoveredPoint.unit}
                </span>
                <span className="text-[11px] text-slate-600 block">
                  Report Source: {hoveredPoint.report_title} ({hoveredPoint.lab_name || 'Laboratory'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Document Reference Range:</span>
                <span className="font-mono text-slate-800 text-[11px] block">
                  {hoveredPoint.reference_range || 'Not provided in report'}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-600">
                  Status: {hoveredPoint.status}
                </span>
              </div>
            </div>
          )}

          {/* Historical Data Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2">Report Date</th>
                  <th className="px-3 py-2">Report Title</th>
                  <th className="px-3 py-2">Reported Value</th>
                  <th className="px-3 py-2">Report-Specific Range</th>
                  <th className="px-3 py-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTrend.data_points.map((dp, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2 font-mono text-slate-700">{dp.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{dp.report_title}</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-900">
                      {dp.raw_value} {dp.unit}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">
                      {dp.reference_range ? dp.reference_range : <em className="text-slate-400">Not provided</em>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                        dp.verified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {dp.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Safety Notice per requirements */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center gap-2 text-[10px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Note on Reference Ranges:</strong> Reference ranges are specific to the laboratory and instrument that generated each report. MedLens does not merge ranges across different testing facilities. Trends visualize raw measurements only without diagnostic assessment.
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
