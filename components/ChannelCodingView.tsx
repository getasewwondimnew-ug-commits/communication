
import React from 'react';
import { ModulationType } from '../types';

interface ChannelCodingViewProps {
  data: string;
  modulationType: ModulationType;
}

export const ChannelCodingView: React.FC<ChannelCodingViewProps> = ({ data, modulationType }) => {
  const bits = data.split('').slice(0, 16);
  
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[340px] flex flex-col gap-4">
      <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
        Symbol Mapping & Gray Coding
      </h3>
      
      <div className="flex-1 grid grid-cols-4 md:grid-cols-8 gap-2">
        {bits.map((bit, i) => (
          <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center gap-2 group hover:border-cyan-500/50 transition-all">
            <span className="text-[10px] text-slate-600 font-black">BIT #{i}</span>
            <div className={`text-lg font-black font-mono ${bit === '1' ? 'text-cyan-400' : 'text-slate-700'}`}>
              {bit}
            </div>
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
               <div className={`h-full ${bit === '1' ? 'bg-cyan-500' : 'bg-transparent'}`} style={{ width: '100%' }}></div>
            </div>
            <span className="text-[8px] text-slate-500 uppercase tracking-tighter">
              {modulationType.includes('B') ? 'Binary' : 'M-ary'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black text-slate-400 uppercase">Coding Scheme: {modulationType}</span>
          <span className="text-[9px] font-black text-cyan-400 uppercase">Clock Locked</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Bits are grouped into symbols for transport. In BPSK, 1 bit = 1 symbol. Gray coding ensures that adjacent symbols differ by only one bit to minimize BER.
        </p>
      </div>
    </div>
  );
};
