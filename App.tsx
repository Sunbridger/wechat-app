import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { Contact, Message, MessageType, User } from './types';
import { getGeminiReply, transcribeAudio } from './services/geminiService';

// Mock Data
const CURRENT_USER: User = {
  id: 'me',
  name: '我',
  avatar: 'https://picsum.photos/id/64/200/200'
};

const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Gemini AI 助手',
    avatar: 'https://picsum.photos/id/5/200/200',
    lastMessage: '你好！我是你的 AI 助手。',
    lastMessageTime: Date.now(),
    isAi: true
  },
  {
    id: '2',
    name: '产品交流群',
    avatar: 'https://picsum.photos/id/1/200/200',
    lastMessage: '欢迎新成员',
    lastMessageTime: Date.now() - 3600000,
    isAi: false,
    isGroup: true,
    hasAiActive: false,
    members: [
        { id: 'me', name: '我', avatar: 'https://picsum.photos/id/64/200/200' },
        { id: 'user_99', name: '管理员', avatar: 'https://picsum.photos/seed/user_99/200' },
        { id: 'user_88', name: '小李', avatar: 'https://picsum.photos/seed/user_88/200' }
    ]
  },
  {
    id: '3',
    name: '创意写作',
    avatar: 'https://picsum.photos/id/91/200/200',
    lastMessage: '我们来写个故事吧。',
    lastMessageTime: Date.now() - 86400000,
    isAi: true
  }
];

// Initial Messages for the first contact
const INITIAL_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      content: '你好！我是你的 Gemini AI 助手。今天有什么可以帮你的？',
      senderId: '1',
      timestamp: Date.now(),
      type: MessageType.TEXT,
      status: 'read'
    }
  ],
  '2': [
    {
        id: 'g1',
        content: '欢迎加入产品交流群！',
        senderId: 'user_99',
        senderName: '管理员',
        timestamp: Date.now() - 100000,
        type: MessageType.TEXT,
        status: 'read'
    }
  ],
  '3': []
};

const App: React.FC = () => {
  // Load from localStorage or use initials
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('wechat_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });
  
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('wechat_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [activeContactId, setActiveContactId] = useState<string>('1');
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [currentTab, setCurrentTab] = useState<TabType>('chat');

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('wechat_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('wechat_messages', JSON.stringify(messagesMap));
  }, [messagesMap]);

  // Sort contacts by last message time
  useEffect(() => {
    setContacts(prev => 
      [...prev].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
    );
  }, [messagesMap]);

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    setCurrentTab('chat'); // Auto switch to chat view when selecting a contact
  };

  const toggleGroupAi = useCallback((contactId: string) => {
      setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, hasAiActive: !c.hasAiActive } : c
      ));
  }, []);

  const handleAddMember = useCallback((contactId: string, name: string) => {
      // 1. Update Contact Members
      const newMemberId = `user_${Date.now()}`;
      const newMember: User = {
          id: newMemberId,
          name: name,
          avatar: `https://picsum.photos/seed/${newMemberId}/200`
      };

      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              return {
                  ...c,
                  members: [...(c.members || []), newMember]
              };
          }
          return c;
      }));

      // 2. Add System Message
      const sysMsg: Message = {
          id: Date.now().toString(),
          content: `"${CURRENT_USER.name}" 邀请 "${name}" 加入了群聊`,
          senderId: 'system',
          timestamp: Date.now(),
          type: MessageType.SYSTEM
      };

      setMessagesMap(prev => ({
          ...prev,
          [contactId]: [...(prev[contactId] || []), sysMsg]
      }));
  }, []);

  const handleSendMessage = useCallback(async (
      content: string, 
      type: MessageType = MessageType.TEXT, 
      extra: { duration?: number, fileName?: string, fileSize?: string } = {}
  ) => {
    if (!activeContactId) return;

    const newMessageId = Date.now().toString();

    const newMessage: Message = {
      id: newMessageId,
      content: content,
      senderId: 'me',
      timestamp: Date.now(),
      type: type,
      audioDuration: extra.duration,
      status: 'sending',
      fileName: extra.fileName,
      fileSize: extra.fileSize
    };

    // 1. Update UI with User Message (Sending)
    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMessage]
    }));

    // Update Last Message in Sidebar
    let previewText = content;
    if (type === MessageType.AUDIO) previewText = '[语音]';
    else if (type === MessageType.IMAGE) previewText = '[图片]';
    else if (type === MessageType.FILE) previewText = '[文件]';

    setContacts(prev => prev.map(c => {
      if (c.id === activeContactId) {
        return { ...c, lastMessage: previewText, lastMessageTime: Date.now() };
      }
      return c;
    }));

    // 2. Handle Audio Transcription if Audio
    if (type === MessageType.AUDIO) {
        // Trigger transcription in background
        transcribeAudio(content).then(text => {
            setMessagesMap(prev => {
                const msgs = prev[activeContactId] || [];
                return {
                    ...prev,
                    [activeContactId]: msgs.map(m => m.id === newMessageId ? { ...m, transcription: text } : m)
                };
            });
        });
    }

    // 3. Simulate Sending Delay -> Mark as SENT
    setTimeout(() => {
      setMessagesMap(prev => {
        const currentMessages = prev[activeContactId] || [];
        return {
          ...prev,
          [activeContactId]: currentMessages.map(msg => 
            msg.id === newMessageId ? { ...msg, status: 'sent' } : msg
          )
        };
      });
    }, 800);

    // 4. Check if contact is AI or if Group AI is active
    const currentContact = contacts.find(c => c.id === activeContactId);
    const shouldAiReply = currentContact?.isAi || (currentContact?.isGroup && currentContact?.hasAiActive);

    if (shouldAiReply) {
      setTypingMap(prev => ({ ...prev, [activeContactId]: true }));

      const history = messagesMap[activeContactId] || [];
      const fullHistory = [...history, newMessage];

      try {
        const aiReplyText = await getGeminiReply(fullHistory, currentContact?.name || "Chat", currentContact?.isGroup);

        // Mark the user's message as READ when AI replies
        setMessagesMap(prev => {
            const currentMessages = prev[activeContactId] || [];
            const updatedMessages = currentMessages.map(msg => 
                msg.id === newMessageId ? { ...msg, status: 'read' as const } : msg
            );

            // In group chat, AI is a specific participant
            const senderId = currentContact?.isGroup ? 'gemini_ai' : activeContactId;
            const senderName = currentContact?.isGroup ? 'Gemini AI' : undefined;

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: aiReplyText,
                senderId: senderId,
                senderName: senderName,
                timestamp: Date.now(),
                type: MessageType.TEXT,
                status: 'sent'
            };

            return {
                ...prev,
                [activeContactId]: [...updatedMessages, aiMessage]
            };
        });

        // Update Last Message in Sidebar
        setContacts(prev => prev.map(c => {
          if (c.id === activeContactId) {
            return { ...c, lastMessage: aiReplyText, lastMessageTime: Date.now() };
          }
          return c;
        }));

      } catch (error) {
        console.error("Failed to get AI reply", error);
      } finally {
        setTypingMap(prev => ({ ...prev, [activeContactId]: false }));
      }
    }
  }, [activeContactId, contacts, messagesMap]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!activeContactId) return;

    // Get current messages from state
    const currentMessages = messagesMap[activeContactId] || [];
    const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
    
    // Update messages map
    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: updatedMessages
    }));

    // Update sidebar preview
    setContacts(prevContacts => prevContacts.map(c => {
      if (c.id === activeContactId) {
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        let preview = "暂无消息";
        if (lastMsg) {
             if (lastMsg.type === MessageType.AUDIO) preview = '[语音]';
             else if (lastMsg.type === MessageType.IMAGE) preview = '[图片]';
             else if (lastMsg.type === MessageType.FILE) preview = '[文件]';
             else preview = lastMsg.content;
        }
        
        return {
          ...c,
          lastMessage: preview,
          lastMessageTime: lastMsg ? lastMsg.timestamp : c.lastMessageTime
        };
      }
      return c;
    }));
  }, [activeContactId, messagesMap]);

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = activeContactId ? (messagesMap[activeContactId] || []) : [];
  const isTyping = activeContactId ? (typingMap[activeContactId] || false) : false;

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#e5e5e5]">
      {/* Main App Container centered on screen like desktop app */}
      <div className="flex w-full h-full md:w-[1000px] md:h-[800px] md:rounded-lg overflow-hidden shadow-2xl bg-[#f5f5f5]">
        {/* Left Sidebar */}
        <div className={`${activeContactId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
          <Sidebar 
            contacts={contacts} 
            activeContactId={activeContactId} 
            onSelectContact={handleSelectContact}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
          />
        </div>

        {/* Right Chat Area */}
        <div className={`${!activeContactId ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
          {activeContact ? (
            <div className="flex flex-col w-full h-full relative">
              {/* Mobile Back Button Overlay */}
              <div className="md:hidden absolute top-4 left-4 z-50">
                 <button 
                   onClick={() => setActiveContactId('')}
                   className="bg-gray-200 p-2 rounded-full text-gray-600"
                 >
                   ← 返回
                 </button>
              </div>
              <ChatWindow 
                activeContact={activeContact}
                messages={currentMessages}
                currentUserAvatar={CURRENT_USER.avatar}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleGroupAi={toggleGroupAi}
                onAddMember={handleAddMember}
                isTyping={isTyping}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400 bg-[#f5f5f5]">
              <div className="text-center">
                <img src="https://picsum.photos/id/2/100/100" className="w-20 h-20 mx-auto mb-4 opacity-20 grayscale rounded-full" alt="Logo"/>
                <p>选择一个聊天开始发送消息</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;