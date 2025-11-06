
import { GoogleGenAI, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this environment, we assume the key is present.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const model = 'gemini-2.5-flash';

export function initializeChat(): Chat {
  const systemInstruction = `
    You are 'SOLARIS', the AI Mission Advisor aboard a deep space solar observatory. 
    Your tone is professional, technical, and slightly futuristic. 
    You will receive mission-critical solar data summaries and user queries.
    Your responses should be concise, informative, and adhere to your persona.
    For initial analysis, provide a report with:
    1. A brief, high-level summary of the current solar state.
    2. Key observations or anomalies.
    3. Recommendations for the crew (e.g., adjust satellite orientation, prepare for high particle flux, etc.).
    For subsequent user questions, provide direct and relevant answers based on the conversation history and the initial data provided.
  `;

  return ai.chats.create({
    model: model,
    config: {
        systemInstruction,
    },
  });
}

export async function sendMessage(chat: Chat, message: string) {
    try {
        const response = await chat.sendMessageStream({ message });
        return response;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get response from AI Mission Advisor.");
    }
}
