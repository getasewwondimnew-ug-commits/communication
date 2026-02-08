
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { ModulationPoint, ModulationType } from '../types';

interface ModulationChartProps {
  data: ModulationPoint[];
  type: ModulationType;
}

export const ModulationChart: React.FC<ModulationChartProps> = ({ data, type }) => {
  // Compress X-axis: Show 20 bits instead of 10.
  // 20 bits * 400 samples per bit = 8000 points.
  const displayData = data.slice(0, 8000);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[450px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-4 text-xs uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Passband Modulation: {type}
        </div>
        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono">PASSBAND SIGNAL</span>
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.2} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} ticks={[-1, 0, 1]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingBottom: '10px', textTransform: 'uppercase' }} />
            <ReferenceLine y={0} stroke="#334155" />
            
            <Line 
              type="stepAfter" 
              dataKey="original" 
              stroke="#64748b" 
              strokeWidth={1} 
              strokeDasharray="5 5"
              dot={false}
              name="Information Envelope"
              isAnimationActive={false}
            />

            <Line 
              type="monotone" 
              dataKey="voltage" 
              stroke="#22d3ee" 
              dot={false}
              strokeWidth={1}
              name="Modulated Carrier"
              isAnimationActive={false}
              className="drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-slate-950/50 p-2 rounded mt-2 border border-slate-800">
        <p className="text-[9px] text-slate-500 italic leading-tight">
          <b>Engineering Reference:</b> View compressed to 20 bits. Each bit width is exactly 1/20th of the X-axis. The <span className="text-cyan-400 font-bold">Blue Wave</span> shows the high-frequency carrier modulated by the baseband logic.
        </p>
      </div>
    </div>
  );
};
