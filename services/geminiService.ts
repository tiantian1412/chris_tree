import { GoogleGenAI, Type } from "@google/genai";
import { HandData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a computer vision engine. Analyze the image to detect a human hand.
1. Detect if a hand is visible.
2. Determine if the hand is "OPEN" (fingers spread, palm visible) or "CLOSED" (fist, pinching, or fingers together).
3. Determine the approximate center position of the hand in the frame (x, y) where 0,0 is top-left and 1,1 is bottom-right.
If no hand is clearly visible, return gesture "NONE".
Output strictly raw JSON without markdown formatting.
`;

export const analyzeGesture = async (base64Image: string): Promise<HandData> => {
  try {
    // Remove data URL prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: "Analyze hand gesture and position.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gesture: {
              type: Type.STRING,
              enum: ["OPEN", "CLOSED", "NONE"],
            },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
          },
          required: ["gesture", "x", "y"],
        },
      },
    });

    let jsonText = response.text;
    if (!jsonText) return { gesture: 'NONE', x: 0.5, y: 0.5 };
    
    // Cleanup markdown if present (e.g. ```json ... ```)
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(jsonText) as HandData;
  } catch (error) {
    console.warn("Gemini Vision Warning (using fallback):", error);
    return { gesture: 'NONE', x: 0.5, y: 0.5 };
  }
};