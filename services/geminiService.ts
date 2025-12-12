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

export const generateInsight = async (summary: AnalyticsSummary): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Please provide a valid API Key to unlock insights.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare a simplified data object to save tokens and focus the model
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

    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I ran into trouble analyzing your data. Please check your API key.";
  }
};

export const generateYearlyRecap = async (
  year: number,
  titles: string[],
  mediaTypeLabel: string
): Promise<string | null> => {
  
  // 1. Ensure user has selected a paid key for the Pro model
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }

  // 2. Initialize with the environment key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 3. Construct a creative prompt for a collage/infographic
  // We take the top unique titles (limit to 12 max to avoid token overload/messy image)
  const uniqueTitles = Array.from(new Set(titles)).slice(0, 12);
  
  const prompt = `Create a spectacular, cinematic movie poster titled '${year} IN REVIEW'.
  The poster should be an artistic collage featuring elements, characters, or vibes from the following ${mediaTypeLabel}:
  ${uniqueTitles.join(', ')}.
  
  Style: High-end digital art, vibrant colors, cohesive composition like a blockbuster crossover poster.
  The text '${year}' should be prominent and stylized.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { 
        parts: [{ text: prompt }] 
      },
      config: {
        imageConfig: {
          imageSize: '2K',
          aspectRatio: '3:4'
        }
      }
    });

    // 4. Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
  return null;
};