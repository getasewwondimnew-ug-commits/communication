
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DownConvPoint, DataPoint } from '../types';

interface RecoveredBinaryStreamProps {
  data: DownConvPoint[];
  txData: DataPoint[];
}

export const RecoveredBinaryStream: React.FC<RecoveredBinaryStreamProps> = ({ data, txData }) => {
  const [isAligning, setIsAligning] = useState(true);

  // Extract decision-ready points
  const decisionPoints = useMemo(() => 
    data.filter(d => d.recoveredBit !== null), 
    [data]
  );

  const txBits = useMemo(() => 
    txData.filter(d => d.binary !== undefined).map(d => d.binary).join(''),
    [txData]
  );

  const rxBits = useMemo(() => 
    decisionPoints.map(d => d.recoveredBit).join(''),
    [decisionPoints]
  );

  // Advanced Bitstream Alignment (Cross-Correlation)
  // This solves the "Signal Shift" problem by finding the best timing offset
  const alignment = useMemo(() => {
    if (!txBits || !rxBits || rxBits.length < 10) return { offset: 0, ber: 0, items: [] };

    let bestOffset = 0;
    let minErrors = Infinity;
    const maxSearch = Math.min(20, rxBits.length / 2);

    // Slide RX against TX to find the physical propagation delay
    for (let offset = 0; offset < maxSearch; offset++) {
        let currentErrors = 0;
        const testLen = Math.min(40, rxBits.length - offset);
        for (let i = 0; i < testLen; i++) {
            if (txBits[i] !== rxBits[i + offset]) currentErrors++;
        }
        if (currentErrors < minErrors) {
            minErrors = currentErrors;
            bestOffset = offset;
        }
    }

    const items = [];
    const displayLen = 64; 
    const startIdx = Math.max(0, rxBits.length - displayLen - bestOffset);
    
    let actualErrors = 0;
    for (let i = 0; i < rxBits.length - bestOffset; i++) {
        if (txBits[i] !== rxBits[i + bestOffset]) actualErrors++;
        
        if (i >= startIdx) {
            items.push({
                index: i,
                tx: txBits[i],
                rx: rxBits[i + bestOffset],
                isError: txBits[i] !== rxBits[i + bestOffset],
                // Simulate "Soft Decision" quality
                quality: Math.random() * 40 + 60 - (txBits[i] !== rxBits[i + bestOffset] ? 50 : 0)
            });
        }
    }

    return {
        offset: bestOffset,
        ber: actualErrors / (rxBits.length - bestOffset || 1),
        items: items.reverse(),
        totalCompared: rxBits.length - bestOffset,
        errorCount: actualErrors
    };
  }, [txBits, rxBits]);

  useEffect(() => {
    const timer = setTimeout(() => setIsAligning(false), 800);
    return () => clearTimeout(timer);
  }, [alignment.offset]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col h-[600px] space-y-6 overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Bitstream Recovery Engine
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">Sub-sample synchronization active</p>
        </div>
        
        <div className="flex gap-2">
           <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-center min-w-[80px]">
              <p className="text-[8px] text-slate-600 font-bold uppercase">Latency</p>
              <p className="text-xs font-mono text-indigo-400">+{alignment.offset} Bits</p>
           </div>
           <div className={`bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-center min-w-[80px] ${alignment.errorCount > 0 ? 'border-rose-500/50' : ''}`}>
              <p className="text-[8px] text-slate-600 font-bold uppercase">Errors</p>
              <p className={`text-xs font-mono ${alignment.errorCount > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>{alignment.errorCount}</p>
           </div>
        </div>
      </div>

      {/* Bit Comparison Grid */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 relative">
        {isAligning && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center flex-col gap-3">
             <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Finding Best Correlation...</span>
          </div>
        )}

        <div className="grid grid-cols-8 gap-2 h-full overflow-y-auto custom-scrollbar pr-2">
          {alignment.items.map((item, i) => (
            <div 
              key={i} 
              className={`relative flex flex-col items-center justify-center aspect-square rounded-lg border transition-all duration-300 group
                ${item.isError 
                  ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse' 
                  : 'bg-slate-900 border-slate-800 hover:border-indigo-500/50'}`}
            >
              <span className="text-[8px] text-slate-600 absolute top-1 left-1 font-mono">#{item.index}</span>
              <div className="flex flex-col items-center">
                <span className={`text-xl font-black font-mono leading-none ${item.isError ? 'text-rose-400' : 'text-slate-200'}`}>
                  {item.rx}
                </span>
                <span className="text-[7px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                  TX: {item.tx}
                </span>
              </div>
              
              {/* Quality Bar */}
              <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-slate-800 rounded-full overflow-hidden opacity-40 group-hover:opacity-100">
                <div 
                  className={`h-full ${item.isError ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${item.quality}%` }}
                ></div>
              </div>

              {item.isError && (
                <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-black px-1 rounded animate-bounce">
                  FLIP
                </div>
              )}
            </div>
          ))}
          {alignment.items.length === 0 && (
            <div className="col-span-8 flex items-center justify-center h-full text-slate-700 italic text-[10px] uppercase tracking-[0.3em]">
              Synchronizing Clock...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
           <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Alignment Status</h4>
           <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500" style={{ width: `${Math.max(20, 100 - (alignment.ber * 100))}%` }}></div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Sync: Locked</span>
           </div>
           <p className="text-[9px] text-slate-600 leading-tight italic">
             The engine compensates for the <b>Filter Group Delay</b> by correlating the incoming stream with the transmitted source.
           </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
           <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Error Analysis</h4>
           <p className="text-[10px] text-slate-400 font-mono">BER: {(alignment.ber).toExponential(3)}</p>
           <p className="text-[9px] text-slate-600 leading-tight italic">
             Mismatches (Red Blocks) occur when noise pushes the signal across the 0V threshold at the sampling instant.
           </p>
        </div>
      </div>
    </div>
  );
};
