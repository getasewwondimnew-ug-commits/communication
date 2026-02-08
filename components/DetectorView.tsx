
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
  Area,
  ReferenceArea
} from 'recharts';
import { DownConvPoint } from '../types';

interface DetectorViewProps {
  data: DownConvPoint[];
  threshold: number;
}

export const DetectorView: React.FC<DetectorViewProps> = ({ data, threshold }) => {
  // UNCOMPRESSED VIEW: 10 symbols (4,000 points)
  const displayData = data.slice(0, 4000);
  
  const dangerZoneLow = threshold - 0.1;
  const dangerZoneHigh = threshold + 0.1;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-[550px] flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
            Decision Device: Logic Recovery
          </h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase">
            Threshold (λ): <span className="text-pink-500">{threshold.toFixed(2)} V</span>
          </p>
        </div>
        <div className="flex gap-2">
           <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter bg-slate-950 px-2 py-1 rounded border border-slate-800">
             Stage: Symbol Detector
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950/40 rounded-xl border border-slate-800 p-2 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.2} />
            <XAxis dataKey="index" hide />
            <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={10} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
              cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            
            <ReferenceArea y1={dangerZoneLow} y2={dangerZoneHigh} fill="#f43f5e" fillOpacity={0.1} />
            
            <ReferenceLine y={threshold} stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" label={{ position: 'right', value: 'λ', fill: '#ec4899', fontSize: 10, fontWeight: 'bold' }} />
            
            {displayData.filter(d => d.sampleInstant !== null).map((d, i) => (
              <ReferenceLine key={i} x={d.index} stroke="#f43f5e" strokeWidth={1} strokeOpacity={0.15} />
            ))}

            <Area 
              type="monotone" 
              dataKey="filtered" 
              stroke="#a855f7" 
              fill="#a855f7" 
              fillOpacity={0.05} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
              name="Analog Baseband" 
            />
            
            <Scatter dataKey="sampleInstant" fill="#f43f5e" shape="circle" name="Sampling Instant" />
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-full backdrop-blur-sm">
           <span className="text-[8px] font-black uppercase text-slate-500 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Noise Margin: Active
           </span>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
         <h4 className="text-[9px] font-black text-pink-500 uppercase flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> Detection Logic (Zoomed)
         </h4>
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <p className="text-[10px] text-slate-400 leading-relaxed italic">
                 The uncompressed view highlights how the noise floor (SNR) impacts the samples at the <b>exact center</b> of each bit.
               </p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] text-rose-400/80 leading-relaxed italic font-medium">
                 Vertical red markers show where the clock "captures" the voltage. If a sample enters the <b>red shade</b>, logic recovery is at risk.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};
