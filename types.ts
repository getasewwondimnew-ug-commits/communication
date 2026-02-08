
export enum WaveformType {
  SINE = 'SINE',
  SQUARE = 'SQUARE',
  SAWTOOTH = 'SAWTOOTH',
  TRIANGLE = 'TRIANGLE'
}

export enum AudioSourceType {
  SYNTHETIC = 'SYNTHETIC',
  FILE = 'FILE',
  MICROPHONE = 'MICROPHONE'
}

export enum QuantizationType {
  UNIFORM = 'UNIFORM',
  NON_UNIFORM_MU_LAW = 'MU_LAW'
}

export enum SamplingType {
  IDEAL = 'IDEAL',
  NATURAL = 'NATURAL',
  FLAT_TOP = 'FLAT_TOP'
}

export enum LineCodeType {
  UNIPOLAR_NRZ = 'UNIPOLAR_NRZ',
  POLAR_NRZ = 'POLAR_NRZ',
  UNIPOLAR_RZ = 'UNIPOLAR_RZ',
  BIPOLAR_RZ = 'BIPOLAR_RZ',
  MANCHESTER = 'MANCHESTER'
}

export enum ModulationType {
  BASK = 'BASK',
  BPSK = 'BPSK',
  BFSK = 'BFSK',
  QPSK = 'QPSK',
  SIXTEEN_QAM = '16-QAM',
  EIGHT_PSK = '8-PSK'
}

export interface SimulationParams {
  signalFreq: number;
  samplingFreq: number;
  bitDepth: number;
  amplitude: number;
  snr: number;
  waveformType: WaveformType;
  audioSourceType: AudioSourceType;
  externalAudioData?: number[]; 
  audioDuration: number; // Duration in seconds
  samplingType: SamplingType;
  quantizationType: QuantizationType;
  lineCodeType: LineCodeType;
  modulationType: ModulationType;
  carrierFreq: number;
  dutyCycle: number;
  filterCutoff: number;
  phaseOffset: number;
  freqOffset: number;
  channelBw: number;
  loFreq: number;
  downConvFilterCutoff: number;
  interpolationWindow: number;
  dacNonLinearity: number; 
  bpfBw: number; 
  decisionThreshold: number; 
}

export interface DataPoint {
  time: number;
  original: number;
  sampled: number;
  quantized: number;
  recoveredQuantized: number;
  qError: number;
  reconstructed: number;
  error: number;
  binary?: string;
}

export interface SignalMetrics {
  bitrate: number;
  mse: number;
  measuredSNR: number;
  theoreticalSQNR: number;
  nyquistLimit: number;
  rawBER: number;
  correctedBER: number;
}

export interface LineCodePoint {
  index: number;
  voltage: number;
  bitValue: string;
}

export interface ModulationPoint {
  index: number;
  voltage: number;
  noisyVoltage: number;
  cleanVoltage: number;
  original: number;
  bitValue: string;
}

export interface DownConvPoint {
  index: number;
  passbandVoltage: number;
  bpfVoltage: number; 
  mixed: number;
  filtered: number;
  sampled: number;
  original: number;
  sampleInstant: number | null;
  recoveredBit: string | null;
  decisionThreshold: number;
}

export interface ConstellationPoint {
  i: number;
  q: number;
  bitValue: string;
}

export interface SpectrumPoint {
  freq: number;
  magnitude: number;
  isAlias: boolean;
}
