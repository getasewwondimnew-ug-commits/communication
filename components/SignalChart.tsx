import React, { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ComposedChart,
  Bar,
  Cell,
  LabelList,
  Scatter
} from 'recharts';
import { DataPoint, SpectrumPoint } from '../types';

interface SignalChartProps {
  data: DataPoint[];
  title: string;
  dataKey?: string;
}

export const SignalChart: React.FC<SignalChartProps> = ({ data, title, dataKey = "sampled" }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[380px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-4 text-xs uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            {title}
        </div>
        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono">TIME DOMAIN</span>
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={[-1.2, 1.2]} 
              stroke="#475569" 
              fontSize={10} 
              ticks={[-1, 0, 1]}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Line 
              type="monotone" 
              dataKey="original" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={false} 
              name="Source" 
              isAnimationActive={false}
            />
            <Line 
              type="step" 
              dataKey={dataKey} 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false} 
              name={dataKey === 'quantized' ? 'Quantized' : 'Sampled'} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const MATLAB_MENUS = ['File', 'Edit', 'View', 'Insert', 'Tools', 'Desktop', 'Window', 'Help'];

// Custom Label component to render peak values above stems
const StemLabel = (props: any) => {
  const { x, y, value } = props;
  if (value < 0.05) return null; // Only label significant peaks
  return (
    <text 
      x={x} 
      y={y - 8} 
      fill="#444" 
      fontSize={10} 
      fontWeight="bold" 
      textAnchor="middle"
      fontFamily="sans-serif"
    >
      {value.toFixed(2)}
    </text>
  );
};

interface MatlabSpectralFigureProps {
  data: SpectrumPoint[];
  referenceData?: SpectrumPoint[];
  title: string;
  lineName: string;
  color?: string;
}

export const MatlabSpectralFigure: React.FC<MatlabSpectralFigureProps> = ({ 
  data, 
  referenceData,
  title, 
  lineName, 
  color = "#D95319" 
}) => {
  const [zoomLimit, setZoomLimit] = useState(2500);

  useEffect(() => {
    if (data.length > 0) {
      const activeData = data.filter(d => d.magnitude > 0.05);
      const maxF = activeData.length > 0 ? activeData[activeData.length - 1].freq : 1000;
      setZoomLimit(Math.max(1000, maxF * 1.15));
    }
  }, [data]);

  const combinedData = useMemo(() => {
    return data
      .filter(d => d.freq >= 0 && d.freq <= zoomLimit)
      .map((d, i) => ({
        freq: d.freq,
        magnitude: d.magnitude
      }));
  }, [data, zoomLimit]);

  return (
    <div className="bg-[#f0f0f0] border border-[#a0a0a0] rounded shadow-2xl h-[340px] font-sans flex flex-col w-full text-slate-900 overflow-hidden">
      {/* MATLAB Window Header */}
      <div className="bg-gradient-to-b from-[#f8f8f8] to-[#e0e0e0] px-2 py-1 flex justify-between items-center border-b border-[#c0c0c0] h-7">
        <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-orange-600 rounded-sm flex items-center justify-center text-[9px] text-white font-bold">M</div>
            <span className="text-[10px] font-semibold text-slate-700">Figure 1: {title}</span>
        </div>
        <div className="flex gap-1 pr-1">
           <div className="w-3.5 h-3.5 bg-white border border-[#c0c0c0] flex items-center justify-center hover:bg-slate-100 cursor-pointer text-[8px]">_</div>
           <div className="w-3.5 h-3.5 bg-white border border-[#c0c0c0] flex items-center justify-center hover:bg-slate-100 cursor-pointer text-[8px]">□</div>
           <div className="w-3.5 h-3.5 bg-[#e81123] border border-[#c0c0c0] flex items-center justify-center text-white text-[8px] hover:bg-red-500 cursor-pointer">✕</div>
        </div>
      </div>

      <div className="bg-[#f0f0f0] px-2 py-0.5 border-b border-[#d0d0d0] flex gap-3 text-[10px]">
        {MATLAB_MENUS.map(m => <span key={m} className="text-slate-700 hover:bg-[#d9e1f2] px-1 transition-colors">{m}</span>)}
      </div>

      <div className="bg-[#f8f8f8] px-3 py-1 border-b border-[#d0d0d0] flex gap-4 items-center">
         <div className="flex gap-1">
            <button onClick={() => setZoomLimit(z => Math.max(100, z * 0.7))} className="w-5 h-5 bg-white border border-[#c0c0c0] flex items-center justify-center text-[9px] hover:bg-slate-100 shadow-sm font-bold">＋</button>
            <button onClick={() => setZoomLimit(z => Math.min(25000, z * 1.3))} className="w-5 h-5 bg-white border border-[#c0c0c0] flex items-center justify-center text-[9px] hover:bg-slate-100 shadow-sm font-bold">－</button>
         </div>
         <div className="h-4 w-px bg-slate-300"></div>
         <div className="flex gap-1.5 text-[9px] font-mono font-bold text-orange-600 uppercase tracking-tight">
            Single-Sided Amplitude Spectrum (Stem)
         </div>
      </div>
      
      <div className="flex-1 bg-white m-4 border border-[#b0b0b0] relative p-1 shadow-inner overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: -20, bottom: 20 }}>
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="2 2" vertical={true} horizontal={true} />
            <XAxis 
              dataKey="freq" 
              type="number"
              domain={[0, zoomLimit]}
              stroke="#000" 
              fontSize={9} 
              tickCount={11}
              allowDataOverflow={true}
              label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -10, fontSize: 9 }}
            />
            <YAxis 
                stroke="#000" 
                fontSize={9} 
                domain={[0, 1.2]} 
                ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2]}
                label={{ value: 'Amplitude (V)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9 }}
            />
            <Tooltip 
              contentStyle={{ fontSize: '9px', backgroundColor: '#ffffcc', border: '1px solid #000' }}
              labelFormatter={(val) => `Frequency: ${Number(val).toFixed(1)} Hz`}
            />
            
            <Bar 
              dataKey="magnitude" 
              barSize={2} 
              fill={color} 
              isAnimationActive={false}
            >
              <LabelList dataKey="magnitude" content={<StemLabel />} />
            </Bar>

            <Scatter 
              dataKey="magnitude" 
              fill={color} 
              isAnimationActive={false}
              shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.magnitude < 0.01) return null;
                  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="#fff" strokeWidth={0.5} />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-[#f0f0f0] border-t border-[#d0d0d0] px-2 py-0.5 text-[9px] text-slate-500 font-mono flex justify-between uppercase tracking-tighter">
         <span>Status: Discrete Spectral Analysis (0 Hz Reference)</span>
         <span>Span: 0 to {zoomLimit.toFixed(0)} Hz</span>
      </div>
    </div>
  );
};

export const MATLABFigureSpectrum: React.FC<{ 
  inputSpectrum: SpectrumPoint[], 
  outputSpectrum: SpectrumPoint[], 
  signalFreq: number 
}> = ({ inputSpectrum, outputSpectrum, signalFreq }) => {
  const [zoomLimit, setZoomLimit] = useState(2500);

  useEffect(() => {
    setZoomLimit(Math.max(1000, signalFreq * 6));
  }, [signalFreq]);

  const combinedData = useMemo(() => {
    return inputSpectrum
      .filter(p => p.freq >= 0 && p.freq <= zoomLimit)
      .map((point, idx) => ({
        freq: point.freq,
        inputMag: point.magnitude,
        outputMag: outputSpectrum.find(os => Math.abs(os.freq - point.freq) < 2)?.magnitude || 0
      }));
  }, [inputSpectrum, outputSpectrum, zoomLimit]);

  return (
    <div className="bg-[#f0f0f0] border border-[#a0a0a0] rounded shadow-2xl h-[380px] font-sans flex flex-col w-full text-slate-900 overflow-hidden">
      <div className="bg-gradient-to-b from-[#f8f8f8] to-[#e0e0e0] px-2 py-1.5 flex justify-between items-center border-b border-[#c0c0c0]">
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-[10px] text-white font-bold">M</div>
            <span className="text-[11px] font-semibold text-slate-700">Spectral Comparison (Single-Sided)</span>
        </div>
      </div>
      
      <div className="bg-[#f0f0f0] px-2 py-0.5 border-b border-[#d0d0d0] flex gap-3 text-[10px]">
        {MATLAB_MENUS.map(m => <span key={m} className="hover:bg-[#d9e1f2] px-1 transition-colors">{m}</span>)}
      </div>
      
      <div className="flex-1 bg-white m-5 border border-[#b0b0b0] relative p-1 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: -10, bottom: 25 }}>
            <CartesianGrid stroke="#cccccc" strokeDasharray="1 1" />
            <XAxis 
              dataKey="freq" 
              type="number"
              domain={[0, zoomLimit]}
              stroke="#000" 
              fontSize={10} 
              allowDataOverflow={true}
              label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -15, fontSize: 10 }}
            />
            <YAxis stroke="#000" fontSize={10} domain={[0, 1.2]} label={{ value: 'Amplitude (V)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: '9px', backgroundColor: '#ffffcc', border: '1px solid #000' }} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', top: 5 }} />
            
            <Bar dataKey="inputMag" barSize={2} fill="#0072BD" name="TX Source" isAnimationActive={false}>
              <LabelList dataKey="inputMag" content={<StemLabel />} />
            </Bar>
            <Scatter dataKey="inputMag" fill="#0072BD" shape="circle" isAnimationActive={false} />

            <Bar dataKey="outputMag" barSize={2} fill="#D95319" name="RX Recovery" isAnimationActive={false} />
            <Scatter dataKey="outputMag" fill="#D95319" shape="circle" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ErrorChart: React.FC<SignalChartProps> = ({ data, title }) => (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl h-[380px] flex flex-col">
      <h3 className="text-slate-400 font-medium mb-4 text-xs uppercase tracking-widest gap-2 flex items-center">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        {title}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis stroke="#475569" fontSize={10} ticks={[-1, 0, 1]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            />
            <Area 
              type="monotone" 
              dataKey="error" 
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.1} 
              name="Signal Deviation" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
);