
import React from 'react';
import { SignalMetrics } from '../types';

interface AnalyticsDashboardProps {
  metrics: SignalMetrics;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ metrics }) => {
  const snrColor = metrics.measuredSNR > 30 ? 'text-emerald-400' : metrics.measuredSNR > 15 ? 'text-amber-400' : 'text-rose-400';
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Measured SNR</p>
          <p className={`text-2xl font-black font-mono ${snrColor}`}>{metrics.measuredSNR.toFixed(2)} <span className="text-xs font-normal opacity-60">dB</span></p>
        </div>
        <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${metrics.measuredSNR > 30 ? 'bg-emerald-500' : metrics.measuredSNR > 15 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.min(100, (metrics.measuredSNR / 60) * 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">System Bitrate</p>
        <p className="text-2xl font-black font-mono text-blue-400">
          {(metrics.bitrate / 1000).toFixed(2)} <span className="text-xs font-normal opacity-60">kbps</span>
        </p>
        <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">fs * bit_depth</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Recon. Error (MSE)</p>
        <p className="text-2xl font-black font-mono text-rose-400">
          {metrics.mse.toExponential(2)}
        </p>
        <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">Noise Variance</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Theo. SQNR</p>
        <p className="text-2xl font-black font-mono text-indigo-400">
          {metrics.theoreticalSQNR.toFixed(2)} <span className="text-xs font-normal opacity-60">dB</span>
        </p>
        <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">6.02n + 1.76</p>
      </div>
    </div>
  );
};
