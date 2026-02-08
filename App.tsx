
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WaveformType, AudioSourceType, SimulationParams, SamplingType, QuantizationType, LineCodeType, ModulationType, DataPoint } from './types';
import { generateSignalPoints, calculateSpectrum, generateLineCodePoints, generateModulationPoints, generateConstellationPoints, calculateMetrics, generateDownConversionPoints, reconstructRecoveredSignal } from './utils/signalMath';
import { analyzeSignal } from './services/geminiService';
import { SignalChart, MatlabSpectralFigure, MATLABFigureSpectrum, ErrorChart } from './components/SignalChart';
import { LineCodeChart } from './components/LineCodeChart';
import { ModulationChart } from './components/ModulationChart';
import { ConstellationChart } from './components/ConstellationChart';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChannelView } from './components/ChannelView';
import { DemodulationChart } from './components/DemodulationChart';
import { ComparisonView } from './components/ComparisonView';
import { ReconstructionChart } from './components/ReconstructionChart';
import { RfFrontEndChart } from './components/RfFrontEndChart';
import { SourceDecoderChart } from './components/SourceDecoderChart';
import { RecoveredBinaryStream } from './components/RecoveredBinaryStream';
import { DetectorView } from './components/DetectorView';
import { BinaryStream } from './components/BinaryStream';

enum SimulationStep {
  SOURCE = 'SOURCE',
  SAMPLING = 'SAMPLING',
  QUANTIZATION = 'QUANTIZATION',
  ENCODING = 'ENCODING',
  BASEBAND = 'BASEBAND',
  PASSBAND = 'PASSBAND',
  CHANNEL = 'CHANNEL',
  RF_FRONT_END = 'RF_FRONT_END',
  DEMODULATION = 'DEMODULATION',
  DETECTOR = 'DETECTOR',
  SOURCE_DECODING = 'SOURCE_DECODING',
  FINAL_RECONSTRUCTION = 'FINAL_RECONSTRUCTION',
  ANALYSIS = 'ANALYSIS'
}

const INITIAL_PARAMS: SimulationParams = {
  signalFreq: 60,
  samplingFreq: 1200,
  bitDepth: 6,
  amplitude: 0.8,
  snr: 45,
  waveformType: WaveformType.SINE,
  audioSourceType: AudioSourceType.SYNTHETIC,
  audioDuration: 0.20,
  samplingType: SamplingType.FLAT_TOP,
  quantizationType: QuantizationType.UNIFORM,
  lineCodeType: LineCodeType.UNIPOLAR_NRZ,
  modulationType: ModulationType.BPSK,
  carrierFreq: 8.0, 
  dutyCycle: 0.5,
  filterCutoff: 1000,
  phaseOffset: 0,
  freqOffset: 0,
  channelBw: 8000,
  loFreq: 8.0, 
  downConvFilterCutoff: 400,
  interpolationWindow: 100,
  dacNonLinearity: 0,
  bpfBw: 2400,
  decisionThreshold: 0.0 
};

const SectionTitle: React.FC<{ title: string; colorClass: string }> = ({ title, colorClass }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className={`w-1.5 h-3 ${colorClass} rounded-full`}></div>
    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h2>
  </div>
);

const ControlWrapper: React.FC<{ label: string; value: string | number; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-1">
    <label className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
      {label}: <span className="text-slate-300 font-mono">{value}</span>
    </label>
    {children}
  </div>
);

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<SimulationStep>(SimulationStep.SOURCE);
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // static data processing
  const rawSourceData = useMemo(() => generateSignalPoints(params), [params]);
  const activeData = rawSourceData;

  const txBitStream = useMemo(() => activeData.filter(d => d.binary !== undefined).map(d => d.binary).join(''), [activeData]);
  const modulationData = useMemo(() => generateModulationPoints(txBitStream || "00000000", params), [txBitStream, params]);
  const downConvData = useMemo(() => generateDownConversionPoints(modulationData, params), [modulationData, params]);
  
  const rxBitStream = useMemo(() => {
    const rawRx = downConvData.filter(d => d.recoveredBit !== null).map(d => d.recoveredBit).join('');
    if (!txBitStream || !rawRx || rawRx.length < 10) return txBitStream;
    let bestOffset = 0;
    let minErrors = Infinity;
    for (let offset = 0; offset < 10; offset++) {
        let errs = 0;
        const len = Math.min(30, rawRx.length - offset);
        for (let i = 0; i < len; i++) {
            if (txBitStream[i] !== rawRx[i+offset]) errs++;
        }
        if (errs < minErrors) { minErrors = errs; bestOffset = offset; }
    }
    return rawRx.substring(bestOffset).padEnd(txBitStream.length, '0');
  }, [downConvData, txBitStream]);

  const finalData = useMemo(() => reconstructRecoveredSignal(activeData, rxBitStream, params), [activeData, rxBitStream, params]);
  const metrics = useMemo(() => calculateMetrics(finalData, params, txBitStream, rxBitStream), [finalData, params, txBitStream, rxBitStream]);
  const lineCodeData = useMemo(() => generateLineCodePoints(txBitStream.substring(0, 64) || "00000000", params.lineCodeType, params.dutyCycle), [txBitStream, params.lineCodeType, params.dutyCycle]);
  const constellationIdeals = useMemo(() => generateConstellationPoints(params.modulationType), [params.modulationType]);

  const spectra = useMemo(() => {
    const durationSim = finalData.length > 0 ? finalData[finalData.length-1].time - finalData[0].time : 0.001;
    const fsSim = (finalData.length / (durationSim || 0.001)) || 1000;
    const bitrate = params.samplingFreq * params.bitDepth;
    const fsLine = bitrate * 20;
    const fsMod = bitrate * 400;

    return {
      input: calculateSpectrum(finalData.map(d => d.original), fsSim, params.signalFreq, 'SOURCE', params),
      adc: calculateSpectrum(finalData.map(d => d.sampled), fsSim, params.signalFreq, 'SAMPLING', params),
      quantized: calculateSpectrum(finalData.map(d => d.quantized), fsSim, params.signalFreq, 'QUANTIZATION', params),
      baseband: calculateSpectrum(lineCodeData.map(d => d.voltage), fsLine, params.signalFreq, 'BASEBAND', params),
      passband: calculateSpectrum(modulationData.map(d => d.voltage), fsMod, params.signalFreq, 'PASSBAND', params),
      noisyPassband: calculateSpectrum(modulationData.map(d => d.noisyVoltage), fsMod, params.signalFreq, 'CHANNEL', params),
      bpf: calculateSpectrum(downConvData.map(d => d.bpfVoltage), fsMod, params.signalFreq, 'RF_FRONT_END', params),
      demod: calculateSpectrum(downConvData.map(d => d.mixed), fsMod, params.signalFreq, 'DEMODULATION', params),
      recoveredQuantized: calculateSpectrum(finalData.map(d => d.recoveredQuantized), fsSim, params.signalFreq, 'SDEC', params),
      recovered: calculateSpectrum(finalData.map(d => d.reconstructed), fsSim, params.signalFreq, 'SOURCE', params)
    };
  }, [finalData, lineCodeData, modulationData, downConvData, params]);

  const updateParam = (key: keyof SimulationParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const length = 2000;
    const step = Math.floor(channelData.length / length);
    const externalData = [];
    for (let i = 0; i < length; i++) {
      externalData.push(channelData[i * step] || 0);
    }

    setParams(prev => ({
      ...prev,
      audioSourceType: AudioSourceType.FILE,
      externalAudioData: externalData,
      audioDuration: audioBuffer.duration
    }));
  };

  const startRecordSnippet = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const length = 2000;
        const step = Math.floor(channelData.length / length);
        const externalData = [];
        for (let i = 0; i < length; i++) {
          externalData.push(channelData[i * step] || 0);
        }

        setParams(prev => ({
          ...prev,
          audioSourceType: AudioSourceType.MICROPHONE,
          externalAudioData: externalData,
          audioDuration: audioBuffer.duration
        }));
        setIsRecording(false);
        setRecordProgress(0);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      let seconds = 0;
      const interval = setInterval(() => {
        seconds += 0.1;
        setRecordProgress((seconds / 10) * 100);
        if (seconds >= 10) {
          mediaRecorder.stop();
          clearInterval(interval);
        }
      }, 100);

    } catch (err) {
      console.error("Mic access failed", err);
    }
  };

  const playOriginal = () => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    let buffer: AudioBuffer;
    if (params.audioSourceType !== AudioSourceType.SYNTHETIC && params.externalAudioData) {
      const duration = params.audioDuration;
      buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const ext = params.externalAudioData;
      for (let i = 0; i < buffer.length; i++) {
        const progress = i / buffer.length;
        const idx = Math.floor(progress * (ext.length - 1));
        data[i] = ext[idx] || 0;
      }
    } else {
      const duration = 1.0;
      buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const { signalFreq, amplitude, waveformType } = params;
      for (let i = 0; i < buffer.length; i++) {
        const t = i / ctx.sampleRate;
        const omega = 2 * Math.PI * signalFreq;
        let val = 0;
        switch (waveformType) {
          case WaveformType.SINE: val = amplitude * Math.sin(omega * t); break;
          case WaveformType.SQUARE: val = amplitude * (Math.sin(omega * t) >= 0 ? 1 : -1); break;
          case WaveformType.SAWTOOTH: val = amplitude * (2 * (t * signalFreq - Math.floor(0.5 + t * signalFreq))); break;
          case WaveformType.TRIANGLE: val = amplitude * (2 * Math.abs(2 * (t * signalFreq - Math.floor(t * signalFreq + 0.5))) - 1); break;
        }
        data[i] = val;
      }
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const playReconstructed = () => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const duration = params.audioSourceType === AudioSourceType.SYNTHETIC ? 1.0 : params.audioDuration;
    const sourceData = new Float32Array(ctx.sampleRate * duration);
    
    if (params.audioSourceType !== AudioSourceType.SYNTHETIC && params.externalAudioData) {
        const ext = params.externalAudioData;
        for (let i = 0; i < sourceData.length; i++) {
          const progress = i / sourceData.length;
          const idx = Math.floor(progress * (ext.length - 1));
          sourceData[i] = ext[idx] || 0;
        }
    } else {
      const { signalFreq, amplitude, waveformType } = params;
      for (let i = 0; i < sourceData.length; i++) {
        const t = i / ctx.sampleRate;
        const omega = 2 * Math.PI * signalFreq;
        let val = 0;
        switch (waveformType) {
          case WaveformType.SINE: val = amplitude * Math.sin(omega * t); break;
          case WaveformType.SQUARE: val = amplitude * (Math.sin(omega * t) >= 0 ? 1 : -1); break;
          case WaveformType.SAWTOOTH: val = amplitude * (2 * (t * signalFreq - Math.floor(0.5 + t * signalFreq))); break;
          case WaveformType.TRIANGLE: val = amplitude * (2 * Math.abs(2 * (t * signalFreq - Math.floor(t * signalFreq + 0.5))) - 1); break;
        }
        sourceData[i] = val;
      }
    }

    const buffer = ctx.createBuffer(1, sourceData.length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const levels = Math.pow(2, params.bitDepth);
    const vMax = params.amplitude;
    const vMin = -params.amplitude;
    const qStep = (vMax - vMin) / (levels - 1 || 1);
    
    const snr = params.snr;
    let rms = 0;
    for (let i = 0; i < sourceData.length; i++) rms += sourceData[i] * sourceData[i];
    const signalPower = rms / sourceData.length || (params.amplitude * params.amplitude) / 2;
    const noisePower = signalPower / (Math.pow(10, snr / 10) || 1);
    const sigma = Math.sqrt(noisePower);

    for (let i = 0; i < sourceData.length; i++) {
      let val = sourceData[i];
      const qLevel = Math.round((val - vMin) / qStep);
      let targetVal = qLevel * qStep + vMin;
      const u1 = Math.random() || 0.001;
      const u2 = Math.random() || 0.001;
      const noise = sigma * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      data[i] = targetVal + noise;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSignal(params);
      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("Analysis failed. Please check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const steps = [
    { id: SimulationStep.SOURCE, label: '01. INFO SOURCE', color: 'bg-blue-500' },
    { id: SimulationStep.SAMPLING, label: '02. SAMPLING', color: 'bg-emerald-400' },
    { id: SimulationStep.QUANTIZATION, label: '03. QUANTIZATION', color: 'bg-emerald-600' },
    { id: SimulationStep.ENCODING, label: '04. ENCODING', color: 'bg-cyan-500' },
    { id: SimulationStep.BASEBAND, label: '05. BASEBAND', color: 'bg-amber-500' },
    { id: SimulationStep.PASSBAND, label: '06. PASSBAND MOD', color: 'bg-cyan-600' },
    { id: SimulationStep.CHANNEL, label: '07. TX CHANNEL', color: 'bg-rose-500' },
    { id: SimulationStep.RF_FRONT_END, label: '08. RX FRONT-END', color: 'bg-amber-400' },
    { id: SimulationStep.DEMODULATION, label: '09. DEMODULATOR', color: 'bg-purple-500' },
    { id: SimulationStep.DETECTOR, label: '10. SYMBOL DETECTOR', color: 'bg-pink-500' },
    { id: SimulationStep.SOURCE_DECODING, label: '11. DECODING', color: 'bg-cyan-500' },
    { id: SimulationStep.FINAL_RECONSTRUCTION, label: '12. LPF RECONSTRUCT', color: 'bg-indigo-600' },
    { id: SimulationStep.ANALYSIS, label: '13. SYSTEM ANALYSIS', color: 'bg-white' }
  ];

  const renderSpectralViewForStep = () => {
    switch(currentStep) {
      case SimulationStep.SOURCE: return <MatlabSpectralFigure data={spectra.input} title="Information Source Spectrum" lineName="Source" />;
      case SimulationStep.SAMPLING: return <MatlabSpectralFigure data={spectra.adc} title="Sampler Output Spectrum" lineName="Sampled" />;
      case SimulationStep.QUANTIZATION: return <MatlabSpectralFigure data={spectra.quantized} title="Quantizer Output Spectrum" lineName="Quantized" />;
      case SimulationStep.BASEBAND: return <MatlabSpectralFigure data={spectra.baseband} title="Baseband Line Code PSD" lineName="Power Density" />;
      case SimulationStep.PASSBAND: return <MatlabSpectralFigure data={spectra.passband} title="TX Passband Modulated Spectrum" lineName="Modulated" />;
      case SimulationStep.CHANNEL: return <MatlabSpectralFigure data={spectra.noisyPassband} title="RX Corrupted Spectrum" lineName="Received" />;
      case SimulationStep.RF_FRONT_END: return <MatlabSpectralFigure data={spectra.bpf} title="Pre-Demodulation Spectrum" lineName="Filtered" />;
      case SimulationStep.DEMODULATION: return <MatlabSpectralFigure data={spectra.demod} title="Demodulated Baseband Spectrum" lineName="Recovered" />;
      case SimulationStep.DETECTOR: return <MatlabSpectralFigure data={spectra.demod} title="Threshold Decision Spectrum" lineName="Slicer" />;
      case SimulationStep.SOURCE_DECODING: return <MatlabSpectralFigure data={spectra.recoveredQuantized} title="Recovered Quantization Spectrum" lineName="Expander" />;
      case SimulationStep.FINAL_RECONSTRUCTION: return <MatlabSpectralFigure data={spectra.recovered} title="DAC Reconstruction Spectrum" lineName="Output" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-200 font-sans p-4 lg:p-6 flex flex-col overflow-hidden">
      <nav className="flex items-center justify-between mb-8 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl overflow-x-auto custom-scrollbar">
        {steps.map((step) => (
          <button key={step.id} onClick={() => setCurrentStep(step.id)} className={`relative flex-none min-w-[120px] py-3 px-2 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 group ${currentStep === step.id ? 'bg-slate-800 border-slate-700 shadow-lg' : 'text-slate-500 hover:bg-slate-800/40'}`}>
            <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-transform ${currentStep === step.id ? `${step.color} scale-125` : 'bg-slate-700'}`}></div>
            <span className={`text-[8px] font-black tracking-tighter ${currentStep === step.id ? 'text-white' : ''}`}>{step.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        <aside className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 overflow-y-auto custom-scrollbar">
              
              {currentStep === SimulationStep.SOURCE && (
                <div className="space-y-5">
                  <SectionTitle title="Information Source" colorClass="bg-blue-500" />
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => updateParam('audioSourceType', AudioSourceType.SYNTHETIC)} 
                      className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${params.audioSourceType === AudioSourceType.SYNTHETIC ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                    >
                      INTERNAL SYNTHESIZER
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${params.audioSourceType === AudioSourceType.FILE ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                    >
                      📁 UPLOAD AUDIO FILE
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />

                    <button 
                      disabled={isRecording}
                      onClick={startRecordSnippet} 
                      className={`relative py-2.5 rounded-xl text-[10px] font-black border transition-all overflow-hidden ${params.audioSourceType === AudioSourceType.MICROPHONE ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'} ${isRecording ? 'opacity-100 ring-2 ring-rose-500' : ''}`}
                    >
                      {isRecording && (
                        <div className="absolute inset-0 bg-rose-600/30 transition-all" style={{ width: `${recordProgress}%` }}></div>
                      )}
                      <span className="relative z-10">{isRecording ? `🎤 RECORDING...` : '🎤 RECORD 10s SAMPLE'}</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <button onClick={playOriginal} className="w-full py-2 bg-slate-800 border border-slate-700 rounded text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">🔊 Listen to High-Quality Source</button>
                  </div>

                  {params.audioSourceType === AudioSourceType.SYNTHETIC && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                      <ControlWrapper label="Waveform" value={params.waveformType}>
                        <select className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded text-blue-400" value={params.waveformType} onChange={(e) => updateParam('waveformType', e.target.value as WaveformType)}>
                            {Object.values(WaveformType).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </ControlWrapper>
                      <ControlWrapper label="Frequency" value={`${params.signalFreq} Hz`}><input type="range" min="10" max="200" step="10" className="w-full accent-blue-500" value={params.signalFreq} onChange={(e) => updateParam('signalFreq', Number(e.target.value))} /></ControlWrapper>
                      <ControlWrapper label="Amplitude" value={`${params.amplitude} V`}><input type="range" min="0.1" max="1.0" step="0.05" className="w-full accent-blue-500" value={params.amplitude} onChange={(e) => updateParam('amplitude', Number(e.target.value))} /></ControlWrapper>
                    </div>
                  )}
                </div>
              )}

              {currentStep === SimulationStep.SAMPLING && (
                <div className="space-y-5">
                  <SectionTitle title="Sampling Stage" colorClass="bg-emerald-400" />
                  <ControlWrapper label="Sampling Rate (fs)" value={`${params.samplingFreq} Hz`}><input type="range" min="200" max="4000" step="100" className="w-full accent-emerald-500" value={params.samplingFreq} onChange={(e) => updateParam('samplingFreq', Number(e.target.value))} /></ControlWrapper>
                  <ControlWrapper label="Sampling Method" value={params.samplingType}>
                    <select className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded text-emerald-400" value={params.samplingType} onChange={(e) => updateParam('samplingType', e.target.value as SamplingType)}>
                      {Object.values(SamplingType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.QUANTIZATION && (
                <div className="space-y-5">
                  <SectionTitle title="Quantization Stage" colorClass="bg-emerald-600" />
                  <ControlWrapper label="Resolution (n)" value={`${params.bitDepth} bits`}><input type="range" min="2" max="12" className="w-full accent-emerald-600" value={params.bitDepth} onChange={(e) => updateParam('bitDepth', Number(e.target.value))} /></ControlWrapper>
                  <ControlWrapper label="Quantizer Mode" value={params.quantizationType}>
                    <select className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded text-emerald-500" value={params.quantizationType} onChange={(e) => updateParam('quantizationType', e.target.value as QuantizationType)}>
                      {Object.values(QuantizationType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.BASEBAND && (
                <div className="space-y-5">
                  <SectionTitle title="Baseband Formatting" colorClass="bg-amber-500" />
                  <ControlWrapper label="Line Code" value={params.lineCodeType}>
                    <select className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded text-amber-400" value={params.lineCodeType} onChange={(e) => updateParam('lineCodeType', e.target.value as LineCodeType)}>
                      {Object.values(LineCodeType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </ControlWrapper>
                  <ControlWrapper label="Pulse Duty Cycle" value={`${(params.dutyCycle * 100).toFixed(0)}%`}><input type="range" min="0.1" max="0.9" step="0.05" className="w-full accent-amber-500" value={params.dutyCycle} onChange={(e) => updateParam('dutyCycle', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.PASSBAND && (
                <div className="space-y-5">
                  <SectionTitle title="Passband Modulator" colorClass="bg-cyan-600" />
                  <ControlWrapper label="Scheme" value={params.modulationType}>
                    <select className="w-full bg-slate-950 border border-slate-800 text-[10px] p-2 rounded text-cyan-400" value={params.modulationType} onChange={(e) => updateParam('modulationType', e.target.value as ModulationType)}>
                      {Object.values(ModulationType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </ControlWrapper>
                  <ControlWrapper label="Carrier Freq (fc)" value={`${params.carrierFreq.toFixed(1)} * Rb`}><input type="range" min="1.0" max="20.0" step="0.5" className="w-full accent-cyan-500" value={params.carrierFreq} onChange={(e) => updateParam('carrierFreq', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.CHANNEL && (
                <div className="space-y-5">
                  <SectionTitle title="Transmission Channel" colorClass="bg-rose-500" />
                  <ControlWrapper label="Channel SNR" value={`${params.snr} dB`}><input type="range" min="0" max="80" step="1" className="w-full accent-rose-500" value={params.snr} onChange={(e) => updateParam('snr', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.RF_FRONT_END && (
                <div className="space-y-5">
                  <SectionTitle title="Receiver Front-End" colorClass="bg-amber-400" />
                  <ControlWrapper label="BPF Bandwidth" value={`${params.bpfBw} Hz`}><input type="range" min="400" max="10000" step="400" className="w-full accent-amber-400" value={params.bpfBw} onChange={(e) => updateParam('bpfBw', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.DEMODULATION && (
                <div className="space-y-5">
                  <SectionTitle title="Signal Demodulator" colorClass="bg-purple-500" />
                  <ControlWrapper label="LO Frequency (fL)" value={`${params.loFreq.toFixed(1)} * Rb`}><input type="range" min="1.0" max="20.0" step="0.1" className="w-full accent-purple-500" value={params.loFreq} onChange={(e) => updateParam('loFreq', Number(e.target.value))} /></ControlWrapper>
                  <ControlWrapper label="Phase Synch" value={`${params.phaseOffset.toFixed(0)}°`}><input type="range" min="-180" max="180" step="5" className="w-full accent-purple-500" value={params.phaseOffset} onChange={(e) => updateParam('phaseOffset', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.DETECTOR && (
                <div className="space-y-5">
                  <SectionTitle title="Symbol Detector" colorClass="bg-pink-500" />
                  <ControlWrapper label="Threshold (λ)" value={`${params.decisionThreshold.toFixed(2)} V`}><input type="range" min="-1.0" max="1.0" step="0.05" className="w-full accent-pink-500" value={params.decisionThreshold} onChange={(e) => updateParam('decisionThreshold', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              {currentStep === SimulationStep.FINAL_RECONSTRUCTION && (
                <div className="space-y-5">
                  <SectionTitle title="LPF Reconstruction" colorClass="bg-indigo-600" />
                  <button onClick={playReconstructed} className="w-full py-4 bg-indigo-600 rounded-xl text-[11px] font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mb-6 uppercase tracking-widest">🔊 Listen to Analog Recovery</button>
                  <ControlWrapper label="Interpolation Window" value={params.interpolationWindow}><input type="range" min="20" max="400" step="10" className="w-full accent-indigo-500" value={params.interpolationWindow} onChange={(e) => updateParam('interpolationWindow', Number(e.target.value))} /></ControlWrapper>
                  <ControlWrapper label="DAC Non-Linearity" value={params.dacNonLinearity.toFixed(2)}><input type="range" min="0" max="0.5" step="0.01" className="w-full accent-indigo-500" value={params.dacNonLinearity} onChange={(e) => updateParam('dacNonLinearity', Number(e.target.value))} /></ControlWrapper>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                 <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 uppercase font-black">Link Stability</span><span className={`text-[9px] font-bold ${metrics.rawBER > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>{(100 - metrics.rawBER * 100).toFixed(1)}%</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 uppercase font-black">Serial Bitrate</span><span className="text-[9px] text-blue-400 font-mono">{(metrics.bitrate/1000).toFixed(1)} kbps</span></div>
              </div>
           </div>
        </aside>

        <main className="lg:col-span-9 flex flex-col gap-6 overflow-y-auto pb-6 custom-scrollbar px-1">
          {currentStep === SimulationStep.ANALYSIS ? (
             <div className="space-y-6">
                <ComparisonView data={finalData} metrics={metrics} />
                <MATLABFigureSpectrum inputSpectrum={spectra.input} outputSpectrum={spectra.recovered} signalFreq={params.signalFreq} />
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                   <h3 className="text-white font-black text-sm uppercase mb-4">Engineering Insights</h3>
                   <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysis || "Run AI Review for complete system performance evaluation."}</div>
                   <button onClick={runAiAnalysis} disabled={isAnalyzing} className="mt-6 w-full py-3 bg-blue-600 rounded text-[10px] font-black hover:bg-blue-500 transition-colors uppercase tracking-widest">{isAnalyzing ? "Analyzing System Data..." : "✨ Generate AI Performance Report"}</button>
                </div>
             </div>
          ) : (
            <>
              <AnalyticsDashboard metrics={metrics} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {currentStep === SimulationStep.SOURCE && <SignalChart data={activeData} title="Information Source Waveform" dataKey="original" />}
                  {currentStep === SimulationStep.SAMPLING && <SignalChart data={activeData} title="Sampling Conversion (Discrete-Time)" dataKey="sampled" />}
                  {currentStep === SimulationStep.QUANTIZATION && <SignalChart data={activeData} title="Quantized Signal (Voltage Levels)" dataKey="quantized" />}
                  {currentStep === SimulationStep.ENCODING && <BinaryStream data={activeData} />}
                  {currentStep === SimulationStep.BASEBAND && <LineCodeChart data={lineCodeData} type={params.lineCodeType} />}
                  {currentStep === SimulationStep.PASSBAND && <ModulationChart data={modulationData} type={params.modulationType} />}
                  {currentStep === SimulationStep.CHANNEL && <ChannelView data={modulationData} snr={params.snr} onSnrChange={(v) => updateParam('snr', v)} />}
                  {currentStep === SimulationStep.RF_FRONT_END && <RfFrontEndChart data={downConvData} bpfBw={params.bpfBw} />}
                  {currentStep === SimulationStep.DEMODULATION && <DemodulationChart data={downConvData} txData={activeData} title="Signal Demodulator (Baseband Recovery)" lineCodeType={params.lineCodeType} />}
                  {currentStep === SimulationStep.DETECTOR && <DetectorView data={downConvData} threshold={params.decisionThreshold} />}
                  {currentStep === SimulationStep.SOURCE_DECODING && <SourceDecoderChart data={finalData} title="Decoding (PCM Level Recovery)" />}
                  {currentStep === SimulationStep.FINAL_RECONSTRUCTION && <ReconstructionChart data={finalData} title="Reconstructed Analog Signal (LPF)" />}
                </div>
                <div className="space-y-6">
                   {renderSpectralViewForStep()}
                   {([SimulationStep.PASSBAND, SimulationStep.CHANNEL, SimulationStep.RF_FRONT_END, SimulationStep.DEMODULATION, SimulationStep.DETECTOR].includes(currentStep)) && (
                     <ConstellationChart idealPoints={constellationIdeals} type={params.modulationType} snr={params.snr} phaseOffset={params.phaseOffset} />
                   )}
                   {currentStep === SimulationStep.FINAL_RECONSTRUCTION && (
                     <div className="space-y-6">
                        <ErrorChart data={finalData} title="Reconstruction Error & Distortion" />
                        <ComparisonView data={finalData} metrics={metrics} />
                     </div>
                   )}
                   {currentStep === SimulationStep.DETECTOR && (
                      <RecoveredBinaryStream data={downConvData} txData={activeData} />
                   )}
                   {currentStep === SimulationStep.ENCODING && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[400px]">
                         <h3 className="text-white font-black text-[10px] uppercase tracking-widest mb-4">Encoding Breakdown</h3>
                         <p className="text-[10px] text-slate-500 italic mb-4">Each multi-level sample is serialized into a {params.bitDepth}-bit binary word.</p>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-600 block mb-1 font-black">Symbol Rate (Rs)</span><p className="text-[9px] text-slate-400">Rate of discrete samples: {params.samplingFreq} symbols/s.</p></div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-600 block mb-1 font-black">Bit Rate (Rb)</span><p className="text-[9px] text-slate-400">Total data velocity: {params.samplingFreq * params.bitDepth} bps.</p></div>
                         </div>
                         <div className="mt-6 p-4 bg-cyan-950/20 border border-cyan-800/30 rounded-xl">
                            <p className="text-[10px] text-cyan-500 font-bold uppercase mb-1">Standard Reference:</p>
                            <p className="text-[9px] text-slate-400 leading-relaxed italic">Source coding reduces redundancy. PCM here provides a standard linear mapping suitable for robust transmission.</p>
                         </div>
                      </div>
                   )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
