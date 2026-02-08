
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
import { DataPoint } from '../types';

interface SourceDecoderChartProps {
  data: DataPoint[];
  title: string;
}

export const SourceDecoderChart: React.FC<SourceDecoderChartProps> = ({ data, title }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[520px] flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            {title}: Level Recovery
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">
            Process: <span className="text-cyan-400">PCM Expansion & Mapping</span>
          </p>
        </div>
        <div className="flex gap-2">
           <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter bg-slate-950 px-2 py-1 rounded border border-slate-800">
             Stage: Digital to Multi-level
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950/40 rounded-xl border border-slate-800 p-2 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
           <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.2} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingBottom: '10px' }} />
              
              <Line 
                type="stepAfter" 
                dataKey="quantized" 
                stroke="#475569" 
                strokeWidth={1} 
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                dot={false} 
                isAnimationActive={false} 
                name="Original Levels (TX)" 
              />
              <Line 
                type="stepAfter" 
                dataKey="recoveredQuantized" 
                stroke="#22d3ee" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} 
                name="Recovered Levels (RX)"
                className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              />
           </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
           <h4 className="text-[9px] font-black text-cyan-500 uppercase mb-2">Quantization Spikes</h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             If the channel SNR is low, bit errors result in sharp vertical spikes in the recovered levels. These "glitches" occur because binary errors map to incorrect discrete voltage levels.
           </p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-2">Link Dependency</h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             Quality is strictly coupled to SNR. As noise increases in the Passband stage, the Bit Error Rate (BER) rises, directly degrading the fidelity of this staircase wave.
           </p>
        </div>
      </div>
    </div>
  );
};
