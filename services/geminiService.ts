import { GoogleGenAI } from "@google/genai";
import { AnalyticsSummary } from "../types";

// Define the global aistudio interface for TypeScript
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

// Helper to handle API calls with retry for auth/permission issues
async function withRetry<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    console.error("Gemini Operation Failed:", error);

    // Convert error to string to catch various formats (nested objects, Error instances, etc.)
    const errStr = (JSON.stringify(error) + (error.message || '') + (error.toString() || '')).toLowerCase();
    
    const isPermissionError = 
      errStr.includes('permission_denied') || 
      errStr.includes('permission denied') || 
      errStr.includes('"code":403') ||
      errStr.includes('"status":403') ||
      errStr.includes('billing');
      
    const isNotFoundError = errStr.includes('requested entity was not found') || errStr.includes('not found');

    // Only attempt interactive retry if we are in the AI Studio environment
    if (window.aistudio && (isPermissionError || isNotFoundError)) {
      console.log("Auth/Permission Error detected. Prompting for new API Key...");
      await window.aistudio.openSelectKey();
      
      // Retry with new key (which is automatically injected into process.env.API_KEY)
      try {
        console.log("Retrying operation with new key...");
        return await apiCall();
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

export const generateYearlyRecap = async (
  year: number,
  titles: string[],
  mediaTypeLabel: string
): Promise<string | null> => {
  
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
  
  const uniqueTitles = Array.from(new Set(titles)).slice(0, 10);
  const prompt = `Create a spectacular, cinematic movie poster titled '${year} IN REVIEW'.
  The poster should be an artistic collage featuring elements, characters, or vibes from the following ${mediaTypeLabel}:
  ${uniqueTitles.join(', ')}.
  
  Style: High-end digital art, vibrant colors, cohesive composition like a blockbuster crossover poster.
  The text '${year}' should be prominent and stylized.`;

  // --- Generation Strategies ---

  // Strategy 1: Flash Image (Primary - Most Stable/Permissive)
  const generateFlash = async () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: '3:4'
                // imageSize not supported on Flash
            }
        }
      });
      return response;
  };

  // Strategy 2: Pro Model (Fallback - Higher Quality but stricter permissions)
  const generatePro = async () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            imageSize: '2K',
            aspectRatio: '3:4'
          }
        }
      });
      return response;
  };

  // --- Execution Flow ---

  try {
    // Attempt 1: Flash Model (Best for stability)
    const response = await withRetry(generateFlash);
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.warn("Flash model failed, attempting fallback to Pro model...", error);
    
    // Attempt 2: Pro Model (Fallback)
    try {
        const response = await withRetry(generatePro);
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
    } catch (finalError) {
        console.error("All image generation attempts failed.", finalError);
        // Throwing here allows the UI to catch it and display the error message
        throw finalError;
    }
  }
  
  return null;
};