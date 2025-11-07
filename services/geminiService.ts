import { GoogleGenAI, Chat } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this environment, we assume the key is present.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const model = 'gemini-2.5-flash';

export function initializeChat(systemInstruction: string): Chat {
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