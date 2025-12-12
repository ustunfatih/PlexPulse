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

const getSystemInstruction = () => `
  You are an expert media analyst with a witty, slightly sassy, but helpful personality. 
  You are analyzing a user's Plex watch history stats.
  Your goal is to provide a "Spotify Wrapped" style summary.
  
  Structure your response in Markdown with these sections:
  1. **The Vibe Check**: A 1-sentence summary of their taste.
  2. **Top Obsessions**: Comment on their most watched movie and TV show.
  3. **Timing Habits**: Analyze when they watch (e.g., "You're a night owl" or "Weekend warrior").
  4. **The Verdict**: A playful rating out of 10 for their media diet.

  Keep it concise (under 250 words total). Use emojis.
`;

const getLocalApiKey = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('geminiApiKey');
    }
  } catch (error) {
    console.warn('Unable to read local Gemini key', error);
  }
  return null;
};

const getApiKey = (): string | null => {
  const local = getLocalApiKey();
  if (local) return local;

  // Vite only exposes env vars prefixed with VITE_, but we also map plain GEMINI_API_KEY in vite.config.ts
  const envKey =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (import.meta.env.GEMINI_API_KEY as string | undefined) ||
    null;

  return envKey || null;
};

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
      
      // Retry with new key (AI Studio injects the selected key into the environment)
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

export const generateInsight = async (summary: AnalyticsSummary): Promise<string> => {
  // Pre-emptive check
  if (window.aistudio) {
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
        await window.aistudio.openSelectKey();
     }
  }

  const performGeneration = async () => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY.");

    const ai = new GoogleGenAI({ apiKey });
    
    const dataContext = JSON.stringify({
      totalHours: summary.totalDurationHours,
      topMovies: summary.topMovies.slice(0, 3),
      topShows: summary.topShows.slice(0, 3),
      busiestDay: summary.playsByDayOfWeek.sort((a,b) => b.count - a.count)[0]?.day,
      peakHour: summary.playsByHour.sort((a,b) => b.count - a.count)[0]?.hour,
      mediaSplit: summary.mediaTypeDistribution
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here is the user's viewing data: ${dataContext}`,
      config: {
        systemInstruction: getSystemInstruction(),
        temperature: 0.7,
      }
    });

    return response.response?.text || response.text || "Could not generate insights.";
  };

  try {
    return await withRetry(performGeneration);
  } catch (error) {
    console.error("Final Insight Error:", error);
    return "Sorry, I couldn't analyze your data. Please ensure you have a valid API key with billing enabled.";
  }
};

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
      const apiKey = getApiKey();
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
      return response.response || response;
  };

  // Strategy 2: Pro Model (Fallback - Higher Quality but stricter permissions)
  const generatePro = async () => {
      const apiKey = getApiKey();
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
      return response.response || response;
  };

  // --- Execution Flow ---

  try {
    // Attempt 1: Flash Model (Best for stability)
    const response = await withRetry(generateFlash);
    const flashParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of flashParts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.warn("Flash model failed, attempting fallback to Pro model...", error);
    
    // Attempt 2: Pro Model (Fallback)
    try {
        const response = await withRetry(generatePro);
        const proParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of proParts) {
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