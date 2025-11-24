import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MessagePart } from "../types";

export const generateContent = async (
  prompt: string,
  attachments: { mimeType: string; data: string }[],
  modelId: string,
  customApiKey?: string,
  customBaseUrl?: string,
  config?: any,
  systemInstruction?: string
): Promise<MessagePart[]> => {
  
  // Initialize with custom key/url if provided, otherwise fallback to environment
  const options: any = { 
    apiKey: customApiKey || process.env.API_KEY 
  };

  if (customBaseUrl) {
    options.baseUrl = customBaseUrl;
  }

  const ai = new GoogleGenAI(options);

  const parts: any[] = [];

  // Add attachments first (images to be analyzed or combined)
  attachments.forEach((att) => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data,
      },
    });
  });

  // Add text prompt
  if (prompt) {
    parts.push({ text: prompt });
  }

  // Merge system instruction into config
  const finalConfig = { ...(config || {}) };
  if (systemInstruction) {
    finalConfig.systemInstruction = systemInstruction;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: parts, // Pass parts array directly for compatibility
      config: finalConfig
    });

    const responseParts: MessagePart[] = [];
    
    // Parse the response candidates
    const candidateContent = response.candidates?.[0]?.content;

    if (candidateContent && candidateContent.parts) {
      for (const part of candidateContent.parts) {
        if (part.text) {
          responseParts.push({ text: part.text });
        } else if (part.inlineData) {
          responseParts.push({
            inlineData: {
              mimeType: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          });
        }
      }
    }

    // Fallback if strict text property usage
    if (responseParts.length === 0 && response.text) {
        responseParts.push({ text: response.text });
    }

    return responseParts;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};