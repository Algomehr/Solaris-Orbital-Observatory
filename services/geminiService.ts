
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this environment, we assume the key is present.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export async function getAiAdvisorResponse(dataSummary: string) {
  const prompt = `
    You are 'SOLARIS', the AI Mission Advisor aboard a deep space solar observatory. 
    Your tone is professional, technical, and slightly futuristic. 
    Analyze the following mission-critical solar data summary and provide a concise report for the crew.
    The report should include:
    1. A brief, high-level summary of the current solar state.
    2. Key observations or anomalies.
    3. Recommendations for the crew (e.g., adjust satellite orientation, prepare for high particle flux, etc.).
    
    Data Summary:
    ---
    ${dataSummary}
    ---
    
    Generate the report now.
  `;

  try {
    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get response from AI Mission Advisor.");
  }
}
