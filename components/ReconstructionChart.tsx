
import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { DataPoint } from '../types';

interface ReconstructionChartProps {
  data: DataPoint[];
  title: string;
}

export const ReconstructionChart: React.FC<ReconstructionChartProps> = ({ data, title }) => {
  const similarity = useMemo(() => {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    data.forEach(p => {
      sumX += p.original;
      sumY += p.reconstructed;
      sumXY += p.original * p.reconstructed;
      sumX2 += p.original * p.original;
      sumY2 += p.reconstructed * p.reconstructed;
    });
    const num = (n * sumXY) - (sumX * sumY);
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : (num / den) * 100;
  }, [data]);

  const hasHighJitter = similarity < 90;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[420px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasHighJitter ? 'bg-rose-500 animate-ping' : 'bg-indigo-500 animate-pulse'}`}></span>
            {title}
        </h3>
        <div className="flex gap-2">
            <div className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-2">
                <span className="text-[8px] text-slate-500 font-black">Link Integrity</span>
                <span className={`text-[10px] font-mono font-black ${similarity > 98 ? 'text-emerald-400' : similarity > 85 ? 'text-amber-400' : 'text-rose-500'}`}>
                    {similarity.toFixed(2)}%
                </span>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950/30 rounded-lg p-2 border border-slate-800/50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} ticks={[-1, 0, 1]} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '10px' }} />
            <ReferenceLine y={0} stroke="#1e293b" />

            <Line 
              type="monotone" 
              dataKey="original" 
              stroke="#334155" 
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false} 
              name="Ideal Source" 
              isAnimationActive={false}
              strokeOpacity={0.5}
            />

            <Line 
              type="monotone" 
              dataKey="reconstructed" 
              stroke={hasHighJitter ? "#fb7185" : "#818cf8"} 
              strokeWidth={2.5} 
              dot={false} 
              name="DAC Analog Output" 
              isAnimationActive={false}
              className={hasHighJitter ? "drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" : "drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
        <p className="text-[9px] text-slate-500 leading-tight italic">
          <span className={`${hasHighJitter ? 'text-rose-400' : 'text-indigo-400'} font-bold uppercase tracking-widest`}>Engineering Diagnostic:</span> {hasHighJitter 
            ? "CRITICAL. Low channel SNR is causing bit-flip glitches and high analog noise floor in the recovery stage." 
            : "STABLE. High channel SNR provides transparent digital transport with negligible analog artifacts."}
        </p>
      </div>
    </div>
  );
};
