
import { WaveformType, AudioSourceType, SimulationParams, DataPoint, SpectrumPoint, SamplingType, QuantizationType, LineCodeType, LineCodePoint, ModulationType, ModulationPoint, ConstellationPoint, SignalMetrics, DownConvPoint } from '../types';

const MU = 255; 

export const compressMuLaw = (x: number, V: number): number => {
  const normalizedX = x / V;
  const sgn = Math.sign(normalizedX);
  const absX = Math.abs(normalizedX);
  const compressed = sgn * (Math.log(1 + MU * absX) / Math.log(1 + MU));
  return compressed * V;
};

export const expandMuLaw = (y: number, V: number): number => {
  const normalizedY = y / V;
  const sgn = Math.sign(normalizedY);
  const absY = Math.abs(normalizedY);
  const expanded = sgn * ( (Math.pow(1 + MU, absY) - 1) / MU );
  return expanded * V;
};

export const toBinary = (value: number, min: number, max: number, bits: number): string => {
  const levels = Math.pow(2, bits);
  const normalized = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(levels - 1, Math.round(normalized * (levels - 1))));
  return clamped.toString(2).padStart(bits, '0');
};

const sinc = (x: number): number => {
  if (x === 0) return 1;
  const piX = Math.PI * x;
  return Math.sin(piX) / piX;
};

const hamming = (n: number, N: number): number => {
  return 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
};

export const generateGaussianNoise = (snrDb: number, refAmplitude: number): number => {
  if (snrDb >= 80) return 0;
  const Ps = (refAmplitude * refAmplitude) / 2;
  const snrLin = Math.pow(10, snrDb / 10);
  const Pn = Ps / (snrLin || 1);
  const sigma = Math.sqrt(Pn);
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random() || 0.0001;
  return sigma * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
};

const getAnalogValueAtTime = (t: number, params: SimulationParams, duration: number) => {
  const { signalFreq, amplitude, waveformType, audioSourceType, externalAudioData } = params;
  
  if (audioSourceType !== AudioSourceType.SYNTHETIC && externalAudioData && externalAudioData.length > 0) {
    const progress = Math.min(1, t / duration);
    const index = Math.floor(progress * (externalAudioData.length - 1));
    return (externalAudioData[index] || 0) * amplitude;
  }

  const omega = 2 * Math.PI * signalFreq;
  switch (waveformType) {
    case WaveformType.SINE: return amplitude * Math.sin(omega * t);
    case WaveformType.SQUARE: return amplitude * (Math.sin(omega * t) >= 0 ? 1 : -1);
    case WaveformType.SAWTOOTH: return amplitude * (2 * (t * signalFreq - Math.floor(0.5 + t * signalFreq)));
    case WaveformType.TRIANGLE: return amplitude * (2 * Math.abs(2 * (t * signalFreq - Math.floor(t * signalFreq + 0.5))) - 1);
    default: return 0;
  }
};

export const generateSignalPoints = (params: SimulationParams): DataPoint[] => {
  const { signalFreq, samplingFreq, bitDepth, amplitude, samplingType, quantizationType, audioSourceType, audioDuration } = params;
  
  const isExternal = audioSourceType !== AudioSourceType.SYNTHETIC;
  const duration = isExternal ? audioDuration : 2 / signalFreq; 
  
  const resolution = 2000; 
  const step = duration / resolution;
  const vMin = -amplitude; const vMax = amplitude;
  const levelsCount = Math.pow(2, bitDepth);
  const qStep = (vMax - vMin) / (levelsCount - 1 || 1);
  const T_s = 1 / samplingFreq;
  const pulseWidth = T_s * 0.4; 

  const samples: { t: number, rawQ: number, binary: string }[] = [];
  for (let t = 0; t <= duration + T_s; t += T_s) {
    const rawVal = getAnalogValueAtTime(t, params, duration);
    let targetVal = rawVal;
    if (quantizationType === QuantizationType.NON_UNIFORM_MU_LAW) {
      targetVal = compressMuLaw(rawVal, amplitude);
    }
    const qLevel = Math.max(0, Math.min(levelsCount - 1, Math.round((targetVal - vMin) / qStep)));
    const qVal = qLevel * qStep + vMin;
    samples.push({ t, rawQ: qVal, binary: toBinary(qVal, vMin, vMax, bitDepth) });
  }

  const points: DataPoint[] = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i * step;
    const original = getAnalogValueAtTime(t, params, duration);
    const sampleIdx = Math.floor(t / T_s);
    const s = samples[sampleIdx] || samples[samples.length - 1];
    const timeInPeriod = t % T_s;
    let displayQuantized = s.rawQ;
    if (quantizationType === QuantizationType.NON_UNIFORM_MU_LAW) {
        displayQuantized = expandMuLaw(s.rawQ, amplitude);
    }
    let sampled = 0;
    if (samplingType === SamplingType.IDEAL) sampled = timeInPeriod < step ? displayQuantized : 0;
    else if (samplingType === SamplingType.NATURAL) sampled = timeInPeriod < pulseWidth ? original : 0;
    else if (samplingType === SamplingType.FLAT_TOP) sampled = timeInPeriod < pulseWidth ? displayQuantized : 0;

    points.push({
      time: t, 
      original, 
      sampled, 
      quantized: displayQuantized, 
      recoveredQuantized: 0, 
      qError: original - displayQuantized, 
      reconstructed: 0, 
      error: 0,
      binary: timeInPeriod < step ? s.binary : undefined
    });
  }
  return points;
};

export const reconstructRecoveredSignal = (points: DataPoint[], recoveredBinary: string, params: SimulationParams): DataPoint[] => {
  const { bitDepth, amplitude, samplingFreq, interpolationWindow, quantizationType, dacNonLinearity, snr } = params;
  const vMin = -amplitude; const vMax = amplitude;
  const levelsCount = Math.pow(2, bitDepth);
  const qStep = (vMax - vMin) / (levelsCount - 1 || 1);
  const T_s = 1 / (samplingFreq || 1200);

  const words: string[] = [];
  for (let i = 0; i < recoveredBinary.length; i += bitDepth) {
    words.push(recoveredBinary.substring(i, i + bitDepth));
  }

  const recoveredSamples = words.map((word, i) => {
    const level = parseInt(word, 2);
    const inlShift = (dacNonLinearity || 0) * Math.sin((level / (levelsCount || 1)) * Math.PI);
    let val = isNaN(level) ? 0 : (level + inlShift) * qStep + vMin;
    if (quantizationType === QuantizationType.NON_UNIFORM_MU_LAW) {
        val = expandMuLaw(val, amplitude);
    }
    return { t: i * T_s, val };
  });

  return points.map(p => {
    let reconstructed = 0;
    const windowSize = Math.max(40, interpolationWindow || 100); 
    const sampleIdx = Math.floor(p.time / T_s);
    const start = Math.max(0, sampleIdx - windowSize);
    const end = Math.min(recoveredSamples.length - 1, sampleIdx + windowSize);
    
    let totalWeight = 0;
    for (let j = start; j <= end; j++) {
      const sample = recoveredSamples[j];
      if (sample) {
        const weight = sinc((p.time - sample.t) * samplingFreq) * hamming(j - start, end - start + 1);
        reconstructed += sample.val * weight;
        totalWeight += weight;
      }
    }
    if (Math.abs(totalWeight) > 0.001) reconstructed /= totalWeight;
    const residualNoise = generateGaussianNoise(snr, amplitude);
    reconstructed += residualNoise;

    const rawDacValue = (recoveredSamples[sampleIdx] || recoveredSamples[recoveredSamples.length - 1] || { val: 0 }).val;
    return {
      ...p,
      recoveredQuantized: rawDacValue,
      reconstructed,
      error: p.original - reconstructed,
      qError: p.original - rawDacValue
    };
  });
};

export const calculateMetrics = (data: DataPoint[], params: SimulationParams, txBits: string = "", rxBits: string = ""): SignalMetrics => {
  const bitrate = params.bitDepth * params.samplingFreq;
  const mse = data.reduce((acc, p) => acc + Math.pow(p.error, 2), 0) / data.length;
  const sqnr = 6.02 * params.bitDepth + 1.76;
  let bitErrors = 0;
  if (txBits.length > 0 && rxBits.length > 0) {
     const len = Math.min(txBits.length, rxBits.length);
     for (let i = 0; i < len; i++) {
        if (txBits[i] !== rxBits[i]) bitErrors++;
     }
  }
  const ber = txBits.length > 0 ? bitErrors / txBits.length : 0;
  return { bitrate, mse, measuredSNR: params.snr, theoreticalSQNR: sqnr, nyquistLimit: params.signalFreq * 2, rawBER: ber, correctedBER: ber };
};

export const calculateSpectrum = (values: number[], fs: number, signalFreq: number, type: string, params: SimulationParams): SpectrumPoint[] => {
  const spectrum: SpectrumPoint[] = [];
  const n = values.length;
  if (n === 0) return [];
  const maxFreq = Math.min(fs / 2, 20000); 
  const numPoints = 300;
  for (let i = 0; i < numPoints; i++) {
    const f = (i / numPoints) * maxFreq;
    let real = 0; let imag = 0;
    const stride = Math.max(1, Math.floor(n / 500));
    let count = 0;
    for (let j = 0; j < n; j += stride) {
      const angle = 2 * Math.PI * f * (j / fs);
      real += values[j] * Math.cos(angle);
      imag -= values[j] * Math.sin(angle);
      count++;
    }
    const mag = (2 * Math.sqrt(real * real + imag * imag)) / count;
    spectrum.push({ freq: f, magnitude: mag, isAlias: f > fs / 2 });
  }
  return spectrum;
};

export const generateLineCodePoints = (txBits: string, type: LineCodeType, dutyCycle: number): LineCodePoint[] => {
  const points: LineCodePoint[] = [];
  const pointsPerBit = 20;
  for (let i = 0; i < txBits.length; i++) {
    const bit = txBits[i];
    for (let j = 0; j < pointsPerBit; j++) {
      const progress = j / pointsPerBit;
      let voltage = 0;
      switch (type) {
        case LineCodeType.UNIPOLAR_NRZ: voltage = bit === '1' ? 1 : 0; break;
        case LineCodeType.POLAR_NRZ: voltage = bit === '1' ? 1 : -1; break;
        case LineCodeType.UNIPOLAR_RZ: voltage = (bit === '1' && progress < dutyCycle) ? 1 : 0; break;
        case LineCodeType.BIPOLAR_RZ: voltage = (bit === '1' && progress < dutyCycle) ? (i % 2 === 0 ? 1 : -1) : 0; break;
        case LineCodeType.MANCHESTER: voltage = bit === '1' ? (progress < 0.5 ? -1 : 1) : (progress < 0.5 ? 1 : -1); break;
      }
      points.push({ index: i * pointsPerBit + j, voltage, bitValue: bit });
    }
  }
  return points;
};

export const generateConstellationPoints = (type: ModulationType): ConstellationPoint[] => {
  switch (type) {
    case ModulationType.BASK: 
      return [{ i: 0, q: 0, bitValue: '0' }, { i: 1, q: 0, bitValue: '1' }];
    case ModulationType.BPSK: 
      return [{ i: -1, q: 0, bitValue: '0' }, { i: 1, q: 0, bitValue: '1' }];
    case ModulationType.BFSK:
      return [{ i: 1, q: 0, bitValue: 'f1' }, { i: 1, q: 0, bitValue: 'f2' }];
    case ModulationType.QPSK:
      return [
        { i: 0.707, q: 0.707, bitValue: '00' },
        { i: -0.707, q: 0.707, bitValue: '01' },
        { i: -0.707, q: -0.707, bitValue: '11' },
        { i: 0.707, q: -0.707, bitValue: '10' }
      ];
    case ModulationType.EIGHT_PSK:
      return Array.from({length: 8}, (_, n) => {
        const angle = (2 * Math.PI * n) / 8;
        return {
          i: Math.cos(angle),
          q: Math.sin(angle),
          bitValue: n.toString(2).padStart(3, '0')
        };
      });
    case ModulationType.SIXTEEN_QAM:
      const points: ConstellationPoint[] = [];
      const levels = [-3, -1, 1, 3];
      levels.forEach(i => levels.forEach(q => {
        points.push({ i: i/3, q: q/3, bitValue: 'xxxx' });
      }));
      return points;
    default: 
      return [{ i: -1, q: 0, bitValue: '0' }, { i: 1, q: 0, bitValue: '1' }];
  }
};

export const generateModulationPoints = (bits: string, params: SimulationParams): ModulationPoint[] => {
  const { modulationType, carrierFreq, samplingFreq, bitDepth, snr, amplitude } = params;
  const points: ModulationPoint[] = [];
  const samplesPerBit = 400; 
  const totalPoints = bits.length * samplesPerBit;
  const bitrate = samplingFreq * bitDepth;
  const duration = (bits.length / (bitrate || 1));
  const dt = duration / (totalPoints || 1);
  const fc = carrierFreq * bitrate; 

  for (let i = 0; i < totalPoints; i++) {
    const t = i * dt;
    const bitIdx = Math.floor(i / samplesPerBit);
    const bit = bits[bitIdx] || '0';
    
    let i_comp = 0;
    let q_comp = 0;
    let current_fc = fc;

    switch (modulationType) {
      case ModulationType.BASK:
        i_comp = bit === '1' ? 1 : 0;
        break;
      case ModulationType.BPSK:
        i_comp = bit === '1' ? 1 : -1;
        break;
      case ModulationType.BFSK:
        i_comp = 1;
        current_fc = bit === '1' ? fc * 1.5 : fc * 0.5;
        break;
      case ModulationType.QPSK: {
        const symbolIdx = Math.floor(bitIdx / 2) * 2;
        const bits_s = bits.substring(symbolIdx, symbolIdx + 2).padEnd(2, '0');
        if (bits_s === '00') { i_comp = 0.707; q_comp = 0.707; }
        else if (bits_s === '01') { i_comp = -0.707; q_comp = 0.707; }
        else if (bits_s === '11') { i_comp = -0.707; q_comp = -0.707; }
        else if (bits_s === '10') { i_comp = 0.707; q_comp = -0.707; }
        break;
      }
      case ModulationType.SIXTEEN_QAM: {
        const symbolIdx = Math.floor(bitIdx / 4) * 4;
        const bits_s = bits.substring(symbolIdx, symbolIdx + 4).padEnd(4, '0');
        const val = parseInt(bits_s, 2);
        const i_level = (val % 4) * 2 - 3; 
        const q_level = (Math.floor(val / 4)) * 2 - 3;
        i_comp = i_level / 3;
        q_comp = q_level / 3;
        break;
      }
      default:
        i_comp = bit === '1' ? 1 : -1;
    }

    const cleanVoltage = amplitude * (i_comp * Math.cos(2 * Math.PI * current_fc * t) - q_comp * Math.sin(2 * Math.PI * current_fc * t));
    const noise = generateGaussianNoise(snr, amplitude);
    const noisyVoltage = cleanVoltage + noise;
    
    points.push({ 
      index: i, 
      voltage: noisyVoltage, 
      noisyVoltage, 
      cleanVoltage, 
      original: (i_comp) * amplitude, 
      bitValue: bit 
    });
  }
  return points;
};

export const generateDownConversionPoints = (modData: ModulationPoint[], params: SimulationParams): DownConvPoint[] => {
  const { loFreq, samplingFreq, bitDepth, decisionThreshold, bpfBw, modulationType } = params;
  const points: DownConvPoint[] = [];
  const bitrate = samplingFreq * bitDepth;
  const samplesPerBit = 400; 
  const totalBits = modData.length / samplesPerBit;
  const duration = totalBits / (bitrate || 1);
  const dt = duration / (modData.length || 1);
  const f_lo = loFreq * bitrate;
  let lastFiltered = 0; const alpha = 0.08; 

  for (let i = 0; i < modData.length; i++) {
    const t = i * dt;
    const bpfSignal = modData[i].voltage; 
    const mixed = 2.0 * bpfSignal * Math.cos(2 * Math.PI * f_lo * t);
    const filtered = alpha * mixed + (1 - alpha) * lastFiltered;
    lastFiltered = filtered;
    
    const isSampleInstant = (i % samplesPerBit) === Math.floor(samplesPerBit / 2);
    points.push({ 
      index: i, 
      passbandVoltage: modData[i].voltage, 
      bpfVoltage: bpfSignal, 
      mixed, 
      filtered, 
      sampled: isSampleInstant ? filtered : 0, 
      original: modData[i].original, 
      sampleInstant: isSampleInstant ? filtered : null, 
      recoveredBit: isSampleInstant ? (filtered > decisionThreshold ? '1' : '0') : null, 
      decisionThreshold 
    });
  }
  return points;
};
