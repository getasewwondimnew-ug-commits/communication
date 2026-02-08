
import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
import { DataPoint } from '../types';

interface BitPoint {
  bitIndex: number;
  level: number;
  bitValue: string;
}

export const BinaryStream: React.FC<{ data: DataPoint[] }> = ({ data }) => {
  const samplesWithBinary = useMemo(() => 
    data.filter(d => d.binary).slice(-12), 
    [data]
  );

  const bitstreamData = useMemo(() => {
    const points: BitPoint[] = [];
    let globalIndex = 0;
    
    samplesWithBinary.forEach((sample) => {
      const bits = sample.binary!.split('');
      bits.forEach((bit) => {
        points.push({
          bitIndex: globalIndex++,
          level: bit === '1' ? 1 : 0,
          bitValue: bit
        });
      });
    });
    return points;
  }, [samplesWithBinary]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col h-[520px] space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            Encoding: PCM Serialization
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">Level-to-Bitstream Transformation</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
           <span className="text-[8px] text-slate-600 font-bold uppercase block">Clock Status</span>
           <span className="text-[10px] text-emerald-400 font-black uppercase">Phase Locked</span>
        </div>
      </div>

      <div className="h-32 bg-[#050810] rounded-xl border border-slate-800 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {bitstreamData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bitstreamData} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
              <YAxis domain={[-0.2, 1.2]} hide />
              <XAxis dataKey="bitIndex" hide />
              <Line 
                type="stepAfter" 
                dataKey="level" 
                stroke="#22d3ee" 
                strokeWidth={2.5} 
                dot={false}
                isAnimationActive={false}
                className="drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-700 text-[10px] uppercase font-bold italic tracking-widest">
            Awaiting Quantization Data...
          </div>
        )}
        
        <div className="absolute top-2 left-0 right-0 flex justify-between px-6 pointer-events-none">
          {bitstreamData.filter((_, i) => i % 4 === 0).slice(0, 16).map((d, i) => (
            <span key={i} className={`text-[8px] font-black font-mono ${d.level === 1 ? 'text-cyan-400' : 'text-slate-600'}`}>
              {d.bitValue}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800 p-4 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between text-slate-600 border-b border-slate-800 pb-2 mb-2 font-black text-[9px] uppercase tracking-widest">
          <span className="w-16">T (s)</span>
          <span className="flex-1 text-center">Digital Symbol (PCM)</span>
          <span className="w-16 text-right">V_in (V)</span>
        </div>
        <div className="space-y-1 font-mono text-[10px]">
          {samplesWithBinary.length > 0 ? (
            samplesWithBinary.map((s, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-800/20 py-1.5 hover:bg-slate-800/30 transition-colors group">
                <span className="text-slate-600 w-16">{s.time.toFixed(4)}</span>
                <span className="flex-1 text-center text-cyan-400 font-bold tracking-[0.4em] group-hover:scale-105 transition-transform">{s.binary}</span>
                <span className="text-slate-500 w-16 text-right">{(s.sampled).toFixed(3)}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-12 text-slate-700 italic">No frames generated</div>
          )}
        </div>
      </div>

      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
        <p className="text-[9px] text-slate-500 leading-tight">
          <span className="text-cyan-400 font-black uppercase tracking-tighter mr-2">Encoder Logic:</span> 
          Linear offset-binary mapping converts sampled voltages into n-bit codewords. This serial bitstream forms the digital payload for the communication system.
        </p>
      </div>
    </div>
  );
};
