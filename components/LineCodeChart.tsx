
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { LineCodePoint, LineCodeType } from '../types';

interface LineCodeChartProps {
  data: LineCodePoint[];
  type: LineCodeType;
}

export const LineCodeChart: React.FC<LineCodeChartProps> = ({ data, type }) => {
  // Compress X-axis: Show 40 bits instead of 20.
  // 40 bits * 20 points per bit = 800 points.
  const displayData = data.slice(0, 800);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[340px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-4 text-xs uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Physical Line Coding: {type.replace('_', ' ')}
        </div>
        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono">BASEBAND SIGNAL</span>
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.2} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} ticks={[-1, 0, 1]} />
            <Tooltip 
              content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                      const d = payload[0].payload as LineCodePoint;
                      return (
                          <div className="bg-slate-800 p-2 text-[10px] border border-slate-700 rounded shadow-lg">
                              <p className="text-slate-400">Logic: <span className="text-white font-bold">{d.bitValue}</span></p>
                              <p className="text-amber-400">Voltage: {d.voltage.toFixed(1)}V</p>
                          </div>
                      );
                  }
                  return null;
              }}
            />
            <ReferenceLine y={0} stroke="#334155" />
            <Area 
              type="stepAfter" 
              dataKey="voltage" 
              stroke="#f59e0b" 
              fill="#f59e0b" 
              fillOpacity={0.1}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2 px-4">
        {displayData.filter((_, i) => i % 20 === 10).map((d, i) => (
            <span key={i} className="text-[8px] font-bold text-slate-600 font-mono">{d.bitValue}</span>
        ))}
      </div>
    </div>
  );
};
