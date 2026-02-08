
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
import { ModulationPoint } from '../types';

interface ChannelViewProps {
  data: ModulationPoint[];
  snr: number;
  onSnrChange?: (val: number) => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({ data, snr, onSnrChange }) => {
  const displayData = data.slice(0, 8000);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[550px] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Transmission Channel: AWGN Simulation
          </h3>
          {onSnrChange && (
            <div className="flex items-center gap-3 mt-1 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 font-black uppercase">Add Thermal Noise</span>
              <input 
                type="range" 
                min="0" 
                max="80" 
                step="1" 
                value={snr} 
                onChange={(e) => onSnrChange(Number(e.target.value))}
                className="w-32 accent-rose-500 h-1.5 cursor-pointer"
              />
            </div>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-end">
             <span className="text-[8px] text-slate-500 font-black uppercase">System SNR</span>
             <span className={`text-sm font-mono font-black ${snr > 20 ? 'text-emerald-400' : 'text-rose-400'}`}>{snr} dB</span>
          </div>
          <div className="w-px h-6 bg-slate-800"></div>
          <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter bg-slate-950 px-2 py-1 rounded border border-slate-800">
             TX Passband
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950/40 rounded-xl border border-slate-800 p-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <ResponsiveContainer width="100%" height="100%">
           <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.2} />
              <XAxis dataKey="index" hide />
              <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ fontSize: '9px', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '10px' }} />
              
              <Line 
                type="monotone" 
                dataKey="cleanVoltage" 
                stroke="#334155" 
                strokeWidth={1} 
                strokeDasharray="5 5"
                dot={false} 
                isAnimationActive={false} 
                name="TX Clean Signal" 
              />
              <Line 
                type="monotone" 
                dataKey="noisyVoltage" 
                stroke="#f43f5e" 
                strokeWidth={1.5} 
                dot={false} 
                isAnimationActive={false} 
                name="Corrupted RX Signal"
                className="drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]"
              />
           </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Noise Variance
           </h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             Gaussian noise power spectral density (N₀/2) degrades the decision reliability at the receiver.
           </p>
        </div>
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> SNR vs. BER
           </h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             The Eb/N₀ ratio determines the fundamental bit error probability in the digital link.
           </p>
        </div>
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
           <h4 className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Shannon Capacity
           </h4>
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             Defines the upper bound on error-free information rate for a given bandwidth and SNR.
           </p>
        </div>
      </div>
    </div>
  );
};
