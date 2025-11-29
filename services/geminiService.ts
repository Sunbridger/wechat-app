import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, MessageType } from "../types";

// System instruction to make the AI behave like a casual chat friend in Chinese
const SYSTEM_INSTRUCTION = "你是一个在聊天软件中的乐于助人、随和且友好的助手。你的回复应该简洁自然，像日常发短信一样。偶尔使用表情符号。请全程使用简体中文与用户交流。";

// Create a mock AI response for when API key is not available
const getMockReply = (allMessages: Message[], contactName: string): string => {
  const lastMessage = allMessages[allMessages.length - 1];
  const messageContent = lastMessage.content.toLowerCase();
  
  // Simple mock responses based on keywords
  if (messageContent.includes('你好') || messageContent.includes('hi') || messageContent.includes('hello')) {
    return `你好！我是${contactName}。很高兴和你聊天！`;
  }
  if (messageContent.includes('天气')) {
    return '今天天气看起来不错呢！';
  }
  if (messageContent.includes('吃饭') || messageContent.includes('吃什么')) {
    return '我也不知道吃什么，不如试试附近的餐厅？';
  }
  if (messageContent.includes('再见') || messageContent.includes('拜拜')) {
    return '再见！下次再聊！';
  }
  return `我是${contactName}，你刚才说：${lastMessage.content}`;
};

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
    
    // Check if API key is available
    if (!process.env.API_KEY) {
      // Return mock response if no API key
      return getMockReply(allMessages, contactName);
    }
    
    // Initialize GoogleGenAI only if API key is available
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Construct history ensuring correct roles and turn-taking
    const formattedHistory: { role: string, parts: any[] }[] = [];

    for (const msg of historyMessages) {
        let role = 'user';
        
        if (isGroup) {
            // In group chat:
            // - 'gemini_ai' is the model
            // - 'me' is a user
            // - other IDs are also users (other humans)
            if (msg.senderId === 'gemini_ai') {
                role = 'model';
            } else {
                role = 'user';
            }
        } else {
            // In private chat:
            // - 'me' is user
            // - the contact (senderId) is the model
            role = msg.senderId === 'me' ? 'user' : 'model';
        }

        let part = formatContentPart(msg);

        // If it's a group user message (not me), prefix the name for context
        if (isGroup && role === 'user' && 'text' in part && msg.senderId !== 'me') {
            const name = msg.senderName || 'Group Member';
            part = { text: `${name}: ${(part as any).text}` };
        }

        // Merge consecutive turns of the same role to satisfy API requirements
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
            formattedHistory[formattedHistory.length - 1].parts.push(part);
        } else {
            formattedHistory.push({ role, parts: [part] });
        }
    }

    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: formattedHistory,
      config: {
        systemInstruction: isGroup 
            ? `${SYSTEM_INSTRUCTION} 你现在在一个名为 "${contactName}" 的群聊中。群成员的消息会带有名字前缀。你需要根据上下文积极参与群聊互动。` 
            : `${SYSTEM_INSTRUCTION} 你现在正在模仿 ${contactName}。`,
      },
    });

    // Prepare the new message part
    let newMessagePart = formatContentPart(lastMessage);
    
    // Add sender name context for the last message if it's a group and not me
    if (isGroup && lastMessage.senderId !== 'me' && 'text' in newMessagePart) {
        const name = lastMessage.senderName || 'Group Member';
        newMessagePart = { text: `${name}: ${(newMessagePart as any).text}` };
    }
    
    const response: GenerateContentResponse = await chat.sendMessage({
      message: [newMessagePart], 
    });

    return response.text || "抱歉，我没想好怎么回。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return mock response if any error occurs
    return getMockReply(allMessages, contactName);
  }
};

/**
 * Transcribes audio content to text using Gemini.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    // Check if API key is available
    if (!process.env.API_KEY) {
      // Return empty string if no API key
      return "[语音消息]";
    }
    
    // Initialize GoogleGenAI only if API key is available
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
    return "[语音消息]";
  }
};