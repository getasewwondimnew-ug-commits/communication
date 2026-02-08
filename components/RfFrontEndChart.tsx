
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DownConvPoint } from '../types';

interface RfFrontEndChartProps {
  data: DownConvPoint[];
  bpfBw: number;
}

export const RfFrontEndChart: React.FC<RfFrontEndChartProps> = ({ data, bpfBw }) => {
  // Compress to 20 bits
  const displayData = data.slice(0, 8000);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[520px] flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            RF Front-End: Bandpass Recovery
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">
            Filter BW: <span className="text-amber-400">{bpfBw} Hz</span>
          </p>
        </div>
        <div className="flex gap-2">
           <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter bg-slate-950 px-2 py-1 rounded border border-slate-800">
             Stage: Pre-Mixer
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950/40 rounded-xl border border-slate-800 p-2 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
           <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.2} />
              <XAxis dataKey="index" hide />
              <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingBottom: '10px' }} />
              
              <Line 
                type="monotone" 
                dataKey="passbandVoltage" 
                stroke="#475569" 
                strokeWidth={1} 
                strokeOpacity={0.3}
                dot={false} 
                isAnimationActive={false} 
                name="Raw Noisy RF" 
              />
              <Line 
                type="monotone" 
                dataKey="bpfVoltage" 
                stroke="#f59e0b" 
                strokeWidth={1.5} 
                dot={false} 
                isAnimationActive={false} 
                name="BPF Filtered Signal"
                className="drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]"
              />
           </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
         <h4 className="text-[9px] font-black text-amber-500 uppercase mb-2">Noise Rejection Principle</h4>
         <p className="text-[10px] text-slate-400 leading-relaxed italic">
           The Bandpass Filter (BPF) removes high-frequency thermal noise and low-frequency interference outside the signal's bandwidth. This significantly improves the signal quality before it enters the nonlinear mixing stage.
         </p>
      </div>
    </div>
  );
};
