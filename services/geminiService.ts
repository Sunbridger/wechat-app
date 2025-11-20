import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, MessageType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction to make the AI behave like a casual chat friend in Chinese
const SYSTEM_INSTRUCTION = "你是一个在聊天软件中的乐于助人、随和且友好的助手。你的回复应该简洁自然，像日常发短信一样。偶尔使用表情符号。请全程使用简体中文与用户交流。";

/**
 * Sends a message to Gemini and gets a response, maintaining a simple context.
 * Handles text, audio, image, and file messages in history.
 */
export const getGeminiReply = async (
  allMessages: Message[],
  contactName: string,
  isGroup: boolean = false
): Promise<string> => {
  try {
    if (allMessages.length === 0) return "Could not process empty message history.";

    // Separate the latest message (trigger) from the history
    const historyMessages = allMessages.slice(0, -1);
    const lastMessage = allMessages[allMessages.length - 1];

    // Helper to format content part
    const formatContentPart = (msg: Message) => {
        if (msg.type === MessageType.AUDIO && msg.content.startsWith('data:')) {
            const base64Data = msg.content.split(',')[1];
            let mimeType = 'audio/webm';
            const mimeMatch = msg.content.match(/data:([^;]+);/);
            if (mimeMatch) mimeType = mimeMatch[1];
            return { inlineData: { mimeType, data: base64Data } };
        } 
        else if (msg.type === MessageType.IMAGE && msg.content.startsWith('data:')) {
            const base64Data = msg.content.split(',')[1];
            let mimeType = 'image/jpeg';
            const mimeMatch = msg.content.match(/data:([^;]+);/);
            if (mimeMatch) mimeType = mimeMatch[1];
            return { inlineData: { mimeType, data: base64Data } };
        }
        else if (msg.type === MessageType.FILE) {
            return { text: `[发送了文件: ${msg.fileName || '未知文件'}]` };
        }
        else {
            return { text: msg.content || "[Empty Message]" };
        }
    };

    // Map history to Gemini format
    const chatHistory = historyMessages.map(msg => {
      const role = msg.senderId === 'me' ? 'user' : 'model';
      const part = formatContentPart(msg);
      
      // For group chats, we prefix user text messages with their name to give context
      if (isGroup && role === 'user' && 'text' in part && msg.senderName) {
         return {
             role,
             parts: [{ text: `${msg.senderName}: ${part.text}` }]
         };
      }

      return {
        role,
        parts: [part],
      };
    });

    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction: isGroup 
            ? `${SYSTEM_INSTRUCTION} 你现在在一个名为 "${contactName}" 的群聊中。你需要根据上下文回复群友的消息。` 
            : `${SYSTEM_INSTRUCTION} 你现在正在模仿 ${contactName}。`,
      },
    });

    // Prepare the new message part
    const newMessagePart = formatContentPart(lastMessage);
    
    // Add sender name context for the last message if it's a group
    let finalMessagePayload = newMessagePart;
    if (isGroup && lastMessage.senderId !== 'me' && 'text' in newMessagePart && lastMessage.senderName) {
        finalMessagePayload = { text: `${lastMessage.senderName}: ${(newMessagePart as any).text}` };
    }
    
    const response: GenerateContentResponse = await chat.sendMessage({
      message: [finalMessagePayload], // Chat.sendMessage expects array of parts or string
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