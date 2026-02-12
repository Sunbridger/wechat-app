
export type MessageStatus = 'sending' | 'sent' | 'read';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  content: string; // Text content or Base64 data URI
  senderId: string; // 当前用户 ID 或联系人/群成员 ID
  senderName?: string; // For group chats
  timestamp: number;
  type: MessageType;
  audioDuration?: number; // Duration in seconds for audio messages
  status?: MessageStatus;
  transcription?: string; // For voice-to-text
  fileName?: string; // For FILE or IMAGE types
  fileSize?: string; // Human readable string e.g. "2.5 MB"
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: number;
  isAi: boolean; // To trigger Gemini
  isGroup?: boolean; // For group chat logic
  hasAiActive?: boolean; // If AI is enabled in this group
  members?: User[]; // For group chats
  peerId?: string; // WebRTC Peer ID for real P2P IM
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  peerId?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  content: string;
}

export interface Moment {
  id: string;
  author: User;
  content: string;
  images: string[];
  video?: string; // Base64 data URI for video
  timestamp: number;
  likes: string[]; // array of names
  comments: Comment[];
}

export interface Sticker {
  id: string;
  url: string; // Base64 or URL
  timestamp: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUser: User;
  toUser: User;
  message?: string;
  timestamp: number;
  status: FriendRequestStatus;
}