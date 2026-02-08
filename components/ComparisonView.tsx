
import React from 'react';
import { DataPoint, SignalMetrics } from '../types';

interface ComparisonViewProps {
  data: DataPoint[];
  metrics: SignalMetrics;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data, metrics }) => {
  const correlation = React.useMemo(() => {
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
    return den === 0 ? 0 : num / den;
  }, [data]);

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl flex flex-col justify-between h-full min-h-[350px]">
        <div>
          <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
            <span className="w-2 h-4 bg-blue-500 rounded-full"></span>
            System Performance Benchmarks
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Signal Correlation (ρ)</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-5xl font-black font-mono tracking-tighter ${correlation > 0.95 ? 'text-emerald-400' : correlation > 0.8 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {correlation.toFixed(4)}
                </p>
                <span className="text-[10px] text-slate-600 font-mono">/ 1.000</span>
              </div>
              <p className="text-[9px] text-slate-600 italic">Pearson coefficient between Source and DAC Output</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Reconstruction Fidelity</p>
              <p className="text-5xl font-black font-mono text-emerald-400 tracking-tighter">
                {(100 - metrics.rawBER * 100).toFixed(1)}<span className="text-xl">%</span>
              </p>
              <p className="text-[9px] text-slate-600 italic">End-to-end bit success probability</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Mean Squared Error (MSE)</p>
              <p className="text-3xl font-black font-mono text-slate-200">
                {metrics.mse.toExponential(3)}
              </p>
              <p className="text-[9px] text-slate-600 italic">Total cumulative noise variance (V²)</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Measured SNR</p>
              <p className="text-3xl font-black font-mono text-blue-400">
                {metrics.measuredSNR.toFixed(2)} <span className="text-lg">dB</span>
              </p>
              <p className="text-[9px] text-slate-600 italic">Channel signal-to-noise ratio</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              Verification result: Correlation values exceeding <b>0.990</b> characterize a transparent communication channel. High MSE values typically originate from low bit-depth quantization or significant channel attenuation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
