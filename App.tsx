import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Moments from './components/Moments';
import NewFriends from './components/NewFriends';
import StickerManager from './components/StickerManager';
import GroupCreator from './components/GroupCreator';
import { Contact, Message, MessageType, User, Moment, Sticker } from './types';
import { getGeminiReply, transcribeAudio } from './services/geminiService';

// Mock Data
const DEFAULT_USER: User = {
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

const INITIAL_MOMENTS: Moment[] = [
  {
      id: 'm1',
      author: { id: '3', name: '创意写作', avatar: 'https://picsum.photos/id/91/200/200' },
      content: '今天在公园看到了一只非常可爱的小狗，忍不住拍了几张照片。生活中的小确幸无处不在！🐶🌳',
      images: ['https://picsum.photos/id/237/400/400', 'https://picsum.photos/id/238/400/400', 'https://picsum.photos/id/239/400/400'],
      timestamp: Date.now() - 1800000, // 30 mins ago
      likes: ['Gemini AI 助手', '小李'],
      comments: [
          { id: 'c1', authorName: 'Gemini AI 助手', content: '真的很可爱！' }
      ]
  },
  {
      id: 'm2',
      author: { id: '2', name: '小李', avatar: 'https://picsum.photos/seed/user_88/200' },
      content: '加班到深夜，看到城市的霓虹，突然觉得一切努力都是值得的。加油，打工人！💪🌃',
      images: ['https://picsum.photos/id/122/500/300'],
      timestamp: Date.now() - 7200000, // 2 hours ago
      likes: ['我'],
      comments: []
  }
];

const INITIAL_STICKERS: Sticker[] = [
    { id: 's1', url: 'https://picsum.photos/id/1025/200/200', timestamp: Date.now() },
    { id: 's2', url: 'https://picsum.photos/id/1062/200/200', timestamp: Date.now() },
    { id: 's3', url: 'https://picsum.photos/id/237/200/200', timestamp: Date.now() },
];

const App: React.FC = () => {
  // Load from localStorage or use initials
  const [currentUser, setCurrentUser] = useState<User>(() => {
      const saved = localStorage.getItem('wechat_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('wechat_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });
  
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('wechat_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [moments, setMoments] = useState<Moment[]>(INITIAL_MOMENTS);
  const [customStickers, setCustomStickers] = useState<Sticker[]>(() => {
      const saved = localStorage.getItem('wechat_stickers');
      return saved ? JSON.parse(saved) : INITIAL_STICKERS;
  });

  const [activeContactId, setActiveContactId] = useState<string>('1');
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [currentTab, setCurrentTab] = useState<TabType>('chat');
  
  // Initialize with a red dot for demo purposes
  const [hasNewMoments, setHasNewMoments] = useState(true);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('wechat_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('wechat_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('wechat_messages', JSON.stringify(messagesMap));
  }, [messagesMap]);

  useEffect(() => {
    localStorage.setItem('wechat_stickers', JSON.stringify(customStickers));
  }, [customStickers]);

  // Sort contacts by last message time
  useEffect(() => {
    setContacts(prev => 
      [...prev].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
    );
  }, [messagesMap]);

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    if (id !== 'new_friends' && id !== 'group_create') {
        setCurrentTab('chat'); // Auto switch to chat view when selecting a regular contact
    }
  };

  const handleTabChange = (tab: TabType) => {
      setCurrentTab(tab);
      // Clear red dot when viewing moments
      if (tab === 'moments') {
          setHasNewMoments(false);
      }
  };

  const toggleGroupAi = useCallback((contactId: string) => {
      setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, hasAiActive: !c.hasAiActive } : c
      ));
  }, []);

  const handleStartGroupChat = useCallback(() => {
      setActiveContactId('group_create');
  }, []);

  const handleCreateGroup = useCallback((name: string, selectedContactIds: string[]) => {
      const newGroupId = `group_${Date.now()}`;
      
      // Find selected contact objects to add as members
      const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));
      const members: User[] = [
          currentUser,
          ...selectedContacts.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))
      ];

      const newGroup: Contact = {
          id: newGroupId,
          name: name,
          avatar: 'https://picsum.photos/id/10/200/200', // Generic group avatar or generate one
          lastMessage: '你创建了群聊',
          lastMessageTime: Date.now(),
          isAi: false,
          isGroup: true,
          members: members,
          hasAiActive: false
      };

      setContacts(prev => [...prev, newGroup]);
      setMessagesMap(prev => ({
          ...prev,
          [newGroupId]: [{
              id: Date.now().toString(),
              content: `你邀请 ${selectedContacts.map(c => c.name).join('、')} 加入了群聊`,
              senderId: 'system',
              timestamp: Date.now(),
              type: MessageType.SYSTEM
          }]
      }));

      setActiveContactId(newGroupId);
      setCurrentTab('chat');
  }, [contacts, currentUser]);

  const handleAddContact = useCallback((name: string, id?: string) => {
      const newId = id || `user_${Date.now()}`;
      // Check if already exists
      if (contacts.some(c => c.id === newId)) {
          setActiveContactId(newId);
          setCurrentTab('chat');
          return;
      }

      const newContact: Contact = {
          id: newId,
          name: name,
          avatar: `https://picsum.photos/seed/${newId}/200`,
          lastMessage: '我们已经是好友了，开始聊天吧',
          lastMessageTime: Date.now(),
          isAi: false
      };

      setContacts(prev => [...prev, newContact]);
      
      // Initialize chat with a system message
      setMessagesMap(prev => ({
          ...prev,
          [newId]: [{
              id: Date.now().toString(),
              content: '我通过了你的朋友验证请求，现在我们可以开始聊天了',
              senderId: 'system',
              timestamp: Date.now(),
              type: MessageType.SYSTEM
          }]
      }));

      setActiveContactId(newId);
      setCurrentTab('chat');
  }, [contacts]);

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
          content: `"${currentUser.name}" 邀请 "${name}" 加入了群聊`,
          senderId: 'system',
          timestamp: Date.now(),
          type: MessageType.SYSTEM
      };

      setMessagesMap(prev => ({
          ...prev,
          [contactId]: [...(prev[contactId] || []), sysMsg]
      }));
  }, [currentUser]);

  const handleUpdateUserAvatar = useCallback((newAvatar: string) => {
      setCurrentUser(prev => ({ ...prev, avatar: newAvatar }));
      // In a real app, we would also update 'me' in all group members lists
  }, []);

  const handleUpdateContactAvatar = useCallback((contactId: string, newAvatar: string) => {
      setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, avatar: newAvatar } : c
      ));
  }, []);

  const handleAddMoment = useCallback((content: string, images: string[], video?: string) => {
    const newMoment: Moment = {
        id: `m_${Date.now()}`,
        author: currentUser,
        content,
        images,
        video,
        timestamp: Date.now(),
        likes: [],
        comments: []
    };
    setMoments(prev => [newMoment, ...prev]);
  }, [currentUser]);

  const handleLikeMoment = useCallback((momentId: string) => {
      setMoments(prev => prev.map(m => {
          if (m.id === momentId) {
              const isLiked = m.likes.includes(currentUser.name);
              let newLikes;
              if (isLiked) {
                  newLikes = m.likes.filter(name => name !== currentUser.name);
              } else {
                  newLikes = [...m.likes, currentUser.name];
              }
              return { ...m, likes: newLikes };
          }
          return m;
      }));
  }, [currentUser]);

  const handleAddComment = useCallback((momentId: string, content: string) => {
    setMoments(prev => prev.map(m => {
        if (m.id === momentId) {
            return {
                ...m,
                comments: [...m.comments, {
                    id: `c_${Date.now()}`,
                    authorName: currentUser.name,
                    content
                }]
            };
        }
        return m;
    }));
  }, [currentUser]);

  // Sticker Handlers
  const handleAddSticker = useCallback((base64: string) => {
      const newSticker: Sticker = {
          id: `s_${Date.now()}`,
          url: base64,
          timestamp: Date.now()
      };
      setCustomStickers(prev => [...prev, newSticker]);
  }, []);

  const handleDeleteSticker = useCallback((id: string) => {
      setCustomStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleReorderStickers = useCallback((startIndex: number, endIndex: number) => {
      setCustomStickers(prev => {
          const result = Array.from(prev);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return result;
      });
  }, []);

  const handleSendMessage = useCallback(async (
      content: string, 
      type: MessageType = MessageType.TEXT, 
      extra: { duration?: number, fileName?: string, fileSize?: string } = {}
  ) => {
    if (!activeContactId || activeContactId === 'new_friends' || activeContactId === 'group_create') return;

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

  // Determine what to render in the main area
  let mainContent;

  if (currentTab === 'moments') {
      mainContent = (
        <div className="flex flex-col w-full h-full relative">
             <div className="md:hidden absolute top-4 left-4 z-50">
               <button 
                 onClick={() => handleTabChange('chat')}
                 className="bg-gray-200 p-2 rounded-full text-gray-600"
               >
                 ← 返回
               </button>
            </div>
            <Moments 
              currentUser={currentUser} 
              moments={moments}
              onAddMoment={handleAddMoment}
              onAddComment={handleAddComment}
              onLikeMoment={handleLikeMoment}
            />
        </div>
      );
  } else if (currentTab === 'stickers') {
      mainContent = (
          <StickerManager 
            stickers={customStickers}
            onAddSticker={handleAddSticker}
            onDeleteSticker={handleDeleteSticker}
            onReorderStickers={handleReorderStickers}
          />
      );
  } else if (activeContactId === 'new_friends') {
      mainContent = <NewFriends onAddContact={handleAddContact} />;
  } else if (activeContactId === 'group_create') {
      mainContent = (
          <GroupCreator 
              contacts={contacts}
              currentUser={currentUser}
              onCreateGroup={handleCreateGroup}
              onCancel={() => {
                  setActiveContactId('');
                  setCurrentTab('chat');
              }}
          />
      );
  } else if (activeContact) {
      mainContent = (
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
            currentUserAvatar={currentUser.avatar}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onToggleGroupAi={toggleGroupAi}
            onAddMember={handleAddMember}
            onUpdateContactAvatar={handleUpdateContactAvatar}
            isTyping={isTyping}
            stickers={customStickers}
          />
        </div>
      );
  } else {
      mainContent = (
        <div className="flex items-center justify-center w-full h-full text-gray-400 bg-[#f5f5f5]">
          <div className="text-center">
            <img src="https://picsum.photos/id/2/100/100" className="w-20 h-20 mx-auto mb-4 opacity-20 grayscale rounded-full" alt="Logo"/>
            <p>选择一个聊天开始发送消息</p>
          </div>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#e5e5e5]">
      {/* Main App Container centered on screen like desktop app */}
      <div className="flex w-full h-full md:w-[1000px] md:h-[800px] md:rounded-lg overflow-hidden shadow-2xl bg-[#f5f5f5]">
        {/* Left Sidebar */}
        <div className={`${(activeContactId || currentTab === 'moments' || currentTab === 'stickers') ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
          <Sidebar 
            contacts={contacts} 
            activeContactId={activeContactId} 
            onSelectContact={handleSelectContact}
            currentTab={currentTab}
            onTabChange={handleTabChange}
            onAddContact={(name) => handleAddContact(name)} 
            onStartGroupChat={handleStartGroupChat}
            hasNewMoments={hasNewMoments}
            currentUser={currentUser}
            onUpdateUserAvatar={handleUpdateUserAvatar}
          />
        </div>

        {/* Right Content Area */}
        <div className={`${(!activeContactId && currentTab !== 'moments' && currentTab !== 'stickers') ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
          {mainContent}
        </div>
      </div>
    </div>
  );
};

export default App;