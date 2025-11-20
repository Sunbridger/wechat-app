export type MessageStatus = 'sending' | 'sent' | 'read';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  content: string; // Text content or Base64 data URI for audio/image
  senderId: string; // 'me' or contactId
  senderName?: string; // For group chats
  timestamp: number;
  type: MessageType;
  audioDuration?: number; // Duration in seconds for audio messages
  status?: MessageStatus;
  transcription?: string; // For voice-to-text
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: number;
  isAi: boolean; // To trigger Gemini
  isGroup?: boolean; // For group chat logic
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}