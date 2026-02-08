
import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { DownConvPoint, DataPoint, LineCodeType } from '../types';

interface DemodulationChartProps {
  data: DownConvPoint[];
  txData?: DataPoint[]; 
  title: string;
  lineCodeType: LineCodeType;
}

export const DemodulationChart: React.FC<DemodulationChartProps> = ({ data, txData, title, lineCodeType }) => {
  const chartData = useMemo(() => {
    // COMPRESSED VIEW: Show 15 symbols (6,000 points at 400 samples/bit)
    // Providing a balanced view of baseband recovery.
    const displayPoints = data.slice(0, 6000);
    
    return displayPoints.map((d, i) => {
      let txBit = null;
      const txIndex = Math.floor(i / (400 / 20));
      if (txData && txData[txIndex]) {
        txBit = txData[txIndex].binary ? (txData[txIndex].binary!.includes('1') ? 1 : 0) : null;
      }

      // Instantaneous hard decision logic (Slicer)
      const isHigh = d.filtered > d.decisionThreshold;
      
      // Map logical bit to the physical voltage of the baseband scheme
      let recoveredVoltage = 0;
      switch (lineCodeType) {
        case LineCodeType.POLAR_NRZ:
        case LineCodeType.MANCHESTER:
          recoveredVoltage = isHigh ? 1.0 : -1.0;
          break;
        case LineCodeType.BIPOLAR_RZ:
          recoveredVoltage = isHigh ? 1.0 : -1.0;
          break;
        case LineCodeType.UNIPOLAR_NRZ:
        case LineCodeType.UNIPOLAR_RZ:
        default:
          recoveredVoltage = isHigh ? 1.0 : 0.0;
          break;
      }

      return {
        ...d,
        txBit: txBit,
        // The slicer output now mirrors the baseband signal format
        encodedDigital: recoveredVoltage, 
      };
    });
  }, [data, txData, lineCodeType]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[520px] flex flex-col space-y-4">
      <h3 className="text-slate-400 font-medium text-xs uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {title}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter bg-slate-800 px-2 py-0.5 rounded">Digital Pulse Recovery</span>
      </h3>

      <div className="flex-1 min-h-0 bg-[#0a0f1d] rounded-lg p-1 relative overflow-hidden border border-slate-800 shadow-inner">
        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} strokeOpacity={0.1} />
            <XAxis dataKey="index" hide />
            <YAxis 
              domain={[-1.2, 1.2]} 
              stroke="#475569" 
              fontSize={10} 
              ticks={[-1, 0, 1]} 
              tick={{ fill: '#475569', fontWeight: 'bold' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', paddingBottom: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
            <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1} />
            
            {/* Background Analog Wave (Subtle Reference) */}
            <Line 
              type="monotone" 
              dataKey="filtered" 
              stroke="#6366f1" 
              strokeWidth={1}
              dot={false} 
              name="Analog Demod (LPF)" 
              isAnimationActive={false}
              strokeOpacity={0.25}
            />

            {/* Recovered Digital Wave (Amber Shaded Style) */}
            <Area 
              type="stepAfter" 
              dataKey="encodedDigital" 
              stroke="#f59e0b" 
              fill="#f59e0b"
              fillOpacity={0.15}
              strokeWidth={2.5}
              dot={false} 
              name={`Recovered ${lineCodeType.split('_')[0]} Wave`} 
              isAnimationActive={false}
              className="drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
           <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Analog Input</h4>
           <p className="text-[10px] text-slate-500 leading-tight">
             Baseband signal corrupted by AWGN and filter ISI (visible as smoothed curve).
           </p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
           <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Slicer Output</h4>
           <p className="text-[10px] text-slate-500 leading-tight">
             Clean pulses reconstructed by the hard-decision detector at {lineCodeType.replace('_', ' ')} levels.
           </p>
        </div>
      </div>

      <div className="bg-amber-950/20 p-2 rounded border border-amber-900/30">
        <p className="text-[9px] text-amber-500/80 leading-tight italic">
          <b>Diagnostic:</b> Displaying 15-bit window. Horizontal scaling provides a high-density view of the recovered baseband pulses.
        </p>
      </div>
    </div>
  );
};
