import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, MessageType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction to make the AI behave like a casual chat friend in Chinese
const SYSTEM_INSTRUCTION = "你是一个在聊天软件中的乐于助人、随和且友好的助手。你的回复应该简洁自然，像日常发短信一样。偶尔使用表情符号。请全程使用简体中文与用户交流。";

/**
 * Sends a message to Gemini and gets a response, maintaining a simple context.
 * Handles both text and audio messages in history.
 */
export const getGeminiReply = async (
  allMessages: Message[],
  contactName: string
): Promise<string> => {
  try {
    if (allMessages.length === 0) return "Could not process empty message history.";

    // Separate the latest message (trigger) from the history
    const historyMessages = allMessages.slice(0, -1);
    const lastMessage = allMessages[allMessages.length - 1];

    // Map history to Gemini format
    const chatHistory = historyMessages.map(msg => {
      const role = msg.senderId === 'me' ? 'user' : 'model';
      
      if (msg.type === MessageType.AUDIO && msg.content.startsWith('data:')) {
        // Extract base64 data
        const base64Data = msg.content.split(',')[1];
        // Assuming webm from MediaRecorder, but generally Gemini is flexible with standard audio types
        let mimeType = 'audio/webm';
        const mimeMatch = msg.content.match(/data:([^;]+);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }

        return {
          role,
          parts: [{ inlineData: { mimeType, data: base64Data } }],
        };
      } else {
        return {
          role,
          parts: [{ text: msg.content || "[Empty Message]" }],
        };
      }
    });

    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION} 你现在正在模仿 ${contactName}。`,
      },
    });

    // Prepare the new message part
    let newMessagePart;
    if (lastMessage.type === MessageType.AUDIO && lastMessage.content.startsWith('data:')) {
       const base64Data = lastMessage.content.split(',')[1];
       let mimeType = 'audio/webm';
       const mimeMatch = lastMessage.content.match(/data:([^;]+);/);
       if (mimeMatch) mimeType = mimeMatch[1];
       
       newMessagePart = [{ inlineData: { mimeType, data: base64Data } }];
    } else {
       newMessagePart = lastMessage.content;
    }
    
    const response: GenerateContentResponse = await chat.sendMessage({
      message: newMessagePart as any,
    });

    return response.text || "抱歉，我没想好怎么回。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "我现在连接网络有点问题。";
  }
};

/**
 * Transcribes audio content to text using Gemini.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const base64Data = base64Audio.split(',')[1];
    let mimeType = 'audio/webm';
    const mimeMatch = base64Audio.match(/data:([^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Please transcribe this audio content verbatim into Simplified Chinese. Do not add any intro or outro." }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
};