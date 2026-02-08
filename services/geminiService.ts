
import { GoogleGenAI } from "@google/genai";
import { SimulationParams } from "../types";

export const analyzeSignal = async (params: SimulationParams): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze this Digital Communication System setup:
    - Signal: ${params.signalFreq}Hz ${params.waveformType}
    - Sampling: ${params.samplingFreq}Hz (${params.samplingType})
    - Quantization: ${params.quantizationType} (${params.bitDepth} bits)
    - Passband Modulation: ${params.modulationType} (Carrier: ${params.carrierFreq})
    - Demodulation Filter Cutoff: ${params.filterCutoff}Hz

    Please provide:
    1. A brief on how ${params.modulationType} handles the digital stream and how it's demodulated at the receiver.
    2. Discuss the Spectral Efficiency of this scheme compared to others.
    3. Evaluate the reconstruction fidelity: explain how the ${params.filterCutoff}Hz filter affects the Signal-to-Noise Ratio (SNR) and aliasing in the baseband demodulated output.
    4. Mention the benefit of ${params.quantizationType} for this specific source waveform and the overall reconstruction.
    Keep it technical and educational for engineering students.
  `;

  try {
    // Upgraded to gemini-3-pro-preview for complex STEM analysis as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    return "AI analysis unavailable.";
  }
};
