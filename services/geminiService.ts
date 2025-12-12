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

const getApiKey = () =>
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.GEMINI_API_KEY ||
  process.env.VITE_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY;

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
        model: 'gemini-2.5-flash-preview-image-generation',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        config: {
            responseModalities: ['Image', 'Text'],
        }
      });
      return response;
  };

  // Strategy 2: Imagen Model (Fallback - Dedicated image generation)
  const generateImagen = async () => {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '3:4'
        }
      });
      return response;
  };

  // Helper to extract image from Gemini response
  const extractImageFromGeminiResponse = (response: any): string | null => {
    // Try multiple response structures
    const candidates =
      response?.candidates ||
      response?.response?.candidates ||
      [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  };

  // Helper to extract image from Imagen response
  const extractImageFromImagenResponse = (response: any): string | null => {
    const images = response?.generatedImages || response?.images || [];
    if (images.length > 0) {
      const img = images[0];
      const data = img.image?.imageBytes || img.imageBytes || img.image?.bytesBase64Encoded;
      if (data) {
        return `data:image/png;base64,${data}`;
      }
    }
    return null;
  };

  // --- Execution Flow ---

  try {
    // Attempt 1: Gemini Flash Model (Best for stability and creativity)
    console.log("Attempting image generation with Gemini Flash...");
    const response = await withRetry(generateFlash);
    const imageUrl = extractImageFromGeminiResponse(response);
    if (imageUrl) {
      console.log("Successfully generated image with Gemini Flash");
      return imageUrl;
    }
    console.warn("Gemini Flash returned no image data");
  } catch (error) {
    console.warn("Gemini Flash model failed, attempting fallback to Imagen...", error);
  }

  // Attempt 2: Imagen Model (Fallback - dedicated image generation)
  try {
    console.log("Attempting image generation with Imagen...");
    const response = await withRetry(generateImagen);
    const imageUrl = extractImageFromImagenResponse(response);
    if (imageUrl) {
      console.log("Successfully generated image with Imagen");
      return imageUrl;
    }
    console.warn("Imagen returned no image data");
  } catch (finalError) {
    console.error("All image generation attempts failed.", finalError);
    throw finalError;
  }

  return null;
};