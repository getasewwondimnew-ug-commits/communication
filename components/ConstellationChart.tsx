
import React, { useMemo } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ConstellationPoint, ModulationType } from '../types';

interface ConstellationChartProps {
  idealPoints: ConstellationPoint[];
  type: ModulationType;
  snr: number;
  phaseOffset: number;
}

export const ConstellationChart: React.FC<ConstellationChartProps> = ({ idealPoints, type, snr, phaseOffset }) => {
  const phaseRad = (phaseOffset * Math.PI) / 180;

  // Generate a cloud of noisy samples based on ideal points and current SNR
  const cloudPoints = useMemo(() => {
    const points: any[] = [];
    const samplesPerSymbol = 30; // Slightly reduced for performance
    
    const Ps = 0.5; 
    const snrLin = Math.pow(10, snr / 10);
    const Pn = Ps / snrLin;
    const sigma = Math.sqrt(Pn);

    idealPoints.forEach(ideal => {
      // Rotate ideal point for display
      const rotI = ideal.i * Math.cos(phaseRad) - ideal.q * Math.sin(phaseRad);
      const rotQ = ideal.i * Math.sin(phaseRad) + ideal.q * Math.cos(phaseRad);

      for (let i = 0; i < samplesPerSymbol; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const noiseI = sigma * Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
        const noiseQ = sigma * Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.sin(2.0 * Math.PI * u2);
        
        const isOne = ideal.bitValue.includes('1');

        points.push({
          i: rotI + noiseI,
          q: rotQ + noiseQ,
          color: isOne ? '#10b981' : '#f43f5e',
          cluster: ideal.bitValue
        });
      }
    });
    return points;
  }, [idealPoints, snr, phaseRad]);

  const rotatedIdeals = useMemo(() => {
    return idealPoints.map(p => ({
      ...p,
      i: p.i * Math.cos(phaseRad) - p.q * Math.sin(phaseRad),
      q: p.i * Math.sin(phaseRad) + p.q * Math.cos(phaseRad)
    }));
  }, [idealPoints, phaseRad]);

  const circles = [0.5, 1.0, 1.5];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[340px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-2 text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        CONSTELLATION CLOUD
      </h3>
      
      <div className="flex-1 flex items-center justify-center bg-slate-950/40 rounded-lg border border-slate-800/50 relative overflow-hidden">
        {/* Radar Style Grid Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          {circles.map(r => (
            <div 
              key={r} 
              className="absolute border border-slate-600 rounded-full" 
              style={{ width: `${r * 140}px`, height: `${r * 140}px` }}
            />
          ))}
          <div className="absolute top-4 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
            Decision Boundary
          </div>
        </div>

        <div className="w-full h-full max-w-[320px] max-h-[320px] z-10">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <XAxis type="number" dataKey="i" domain={[-2, 2]} hide />
              <YAxis type="number" dataKey="q" domain={[-2, 2]} hide />
              <ZAxis type="number" range={[15, 15]} />
              
              <ReferenceLine x={0} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />

              <Scatter 
                data={cloudPoints} 
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle cx={cx} cy={cy} r={2.5} fill={payload.color} fillOpacity={0.4} />
                  );
                }}
              />

              <Scatter 
                data={rotatedIdeals} 
                shape={(props: any) => {
                  const { cx, cy } = props;
                  return (
                    <g>
                      <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#fff" strokeWidth={2} />
                      <line x1={cx - 5} y1={cy + 5} x2={cx + 5} y2={cy - 5} stroke="#fff" strokeWidth={2} />
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center px-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-slate-500 font-bold text-[9px] uppercase tracking-tighter">Bit 1 Cluster</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-slate-500 font-bold text-[9px] uppercase tracking-tighter">Bit 0 Cluster</span>
        </div>
      </div>
    </div>
  );
};
