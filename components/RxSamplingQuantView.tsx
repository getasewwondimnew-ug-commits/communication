
import React from 'react';
import { 
  ComposedChart, 
  Line, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import { DownConvPoint } from '../types';

interface RxSamplingQuantViewProps {
  data: DownConvPoint[];
}

export const RxSamplingQuantView: React.FC<RxSamplingQuantViewProps> = ({ data }) => {
  // We want to highlight the decision threshold and the sampling markers
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[550px] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
          Receiver Signal Discretization (S/Q)
        </h3>
        <div className="flex gap-4 text-[9px] font-mono uppercase tracking-tighter">
           <span className="text-cyan-400">● LPF Waveform</span>
           <span className="text-pink-400">● Threshold (0V)</span>
           <span className="text-rose-500">● Sampling Clock</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Main Sampling Visual */}
        <div className="flex-1 bg-slate-950/40 rounded-xl border border-slate-800 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <ReferenceLine y={0} stroke="#ec4899" strokeDasharray="5 5" strokeWidth={1} label={{ position: 'right', value: 'Decision Threshold', fill: '#ec4899', fontSize: 8 }} />
              
              {/* Show the vertical sampling lines */}
              {data.filter(d => d.sampleInstant !== null).map((d, i) => (
                <ReferenceLine key={i} x={d.index} stroke="#fb7185" strokeWidth={1} strokeOpacity={0.2} />
              ))}

              <Area type="monotone" dataKey="filtered" fill="#22d3ee" fillOpacity={0.05} stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} name="Filtered Baseband" />
              <Scatter dataKey="sampleInstant" fill="#f43f5e" shape="circle" name="Sampled Value" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Binary Mapping Visualization */}
        <div className="h-24 flex items-center gap-1 bg-slate-950 rounded-xl border border-slate-800 px-6 overflow-hidden">
           <div className="text-[10px] font-black text-slate-600 uppercase w-24 leading-tight">Decision Stream</div>
           <div className="flex-1 flex justify-around">
              {data.filter(d => d.recoveredBit !== null).slice(0, 16).map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-1 h-3 rounded-full ${d.recoveredBit === '1' ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'}`}></div>
                  <span className={`text-xs font-black font-mono ${d.recoveredBit === '1' ? 'text-white' : 'text-slate-600'}`}>{d.recoveredBit}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-slate-900 border-t border-slate-800 pt-4 flex gap-6">
        <div className="flex-1">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-1">Concept: Receiver Sampling</h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             The receiver must sample the filtered signal at the optimal moment (typically bit-center) to maximize the signal-to-noise ratio before quantization.
           </p>
        </div>
        <div className="flex-1">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-1">Concept: Level Decision</h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             In binary schemes like BPSK, a simple 0V threshold (slicing) acts as a 1-bit quantizer to recover the digital symbols.
           </p>
        </div>
      </div>
    </div>
  );
};
