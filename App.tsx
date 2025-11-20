
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Moments from './components/Moments';
import NewFriends from './components/NewFriends';
import StickerManager from './components/StickerManager';
import GroupCreator from './components/GroupCreator';
import { Contact, Message, MessageType, User, Moment, Sticker } from './types';
import { getGeminiReply, transcribeAudio } from './services/geminiService';
import { p2pService, P2PMessagePayload } from './services/p2pService';
import { dbService } from './services/dbService';

// Mock Data (Used as initial defaults if DB is empty)
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
  }
];

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
  ]
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
  }
];

const INITIAL_STICKERS: Sticker[] = [
    { id: 's1', url: 'https://picsum.photos/id/1025/200/200', timestamp: Date.now() },
    { id: 's2', url: 'https://picsum.photos/id/1062/200/200', timestamp: Date.now() },
    { id: 's3', url: 'https://picsum.photos/id/237/200/200', timestamp: Date.now() },
];

const App: React.FC = () => {
  // State - Initialized with defaults, updated via DB load
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [moments, setMoments] = useState<Moment[]>(INITIAL_MOMENTS);
  const [customStickers, setCustomStickers] = useState<Sticker[]>(INITIAL_STICKERS);
  
  const [activeContactId, setActiveContactId] = useState<string>('1');
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [currentTab, setCurrentTab] = useState<TabType>('chat');
  const [hasNewMoments, setHasNewMoments] = useState(true);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // 1. Initialize DB and Load Data
  useEffect(() => {
    const initData = async () => {
      try {
        await dbService.init();
        
        const user = await dbService.getUser();
        if (user) setCurrentUser(user);
        else await dbService.saveUser(DEFAULT_USER);

        const savedPeerId = await dbService.getPeerId();
        
        // Initialize P2P with saved ID (if any)
        p2pService.init(savedPeerId || undefined);
        p2pService.setOnIdAssigned((id) => {
          setMyPeerId(id);
          dbService.savePeerId(id);
        });
        p2pService.setOnMessageReceived((payload: P2PMessagePayload) => {
          if (payload.type === 'CHAT_MESSAGE') {
              handleIncomingP2PMessage(payload);
          }
        });

        const loadedContacts = await dbService.getContacts();
        if (loadedContacts.length > 0) setContacts(loadedContacts);
        else await dbService.saveContacts(INITIAL_CONTACTS);

        const loadedMessages = await dbService.getMessagesMap();
        if (Object.keys(loadedMessages).length > 0) setMessagesMap(loadedMessages);
        else await dbService.saveMessages(INITIAL_MESSAGES);

        const loadedMoments = await dbService.getMoments();
        if (loadedMoments.length > 0) setMoments(loadedMoments);
        else await dbService.saveMoments(INITIAL_MOMENTS);

        const loadedStickers = await dbService.getStickers();
        if (loadedStickers.length > 0) setCustomStickers(loadedStickers);
        else await dbService.saveStickers(INITIAL_STICKERS);

        setIsDbLoaded(true);
      } catch (error) {
        console.error("Failed to load data from IndexedDB", error);
      }
    };

    initData();
  }, []);

  // 2. Persistence Effects - Save to IndexedDB on change
  // We skip saving if DB hasn't loaded yet to avoid overwriting DB with initial state
  
  useEffect(() => {
    if (isDbLoaded) dbService.saveUser(currentUser);
  }, [currentUser, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) dbService.saveContacts(contacts);
  }, [contacts, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) dbService.saveMessages(messagesMap);
  }, [messagesMap, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) dbService.saveMoments(moments);
  }, [moments, isDbLoaded]);

  useEffect(() => {
    if (isDbLoaded) dbService.saveStickers(customStickers);
  }, [customStickers, isDbLoaded]);

  // Sort contacts by last message time
  useEffect(() => {
    setContacts(prev => 
      [...prev].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
    );
  }, [messagesMap]);

  const handleIncomingP2PMessage = (payload: P2PMessagePayload) => {
      const { message, senderInfo } = payload;
      
      // Check if contact exists, if not, add them
      setContacts(prev => {
          const existing = prev.find(c => c.peerId === senderInfo.id || c.name === senderInfo.name); 
          if (existing) {
              return prev.map(c => c.id === existing.id ? {
                  ...c, 
                  lastMessage: message.type === MessageType.TEXT ? message.content : `[${message.type}]`,
                  lastMessageTime: Date.now()
              } : c);
          } else {
              // Auto-add new P2P contact
              const newId = `p2p_${senderInfo.id}`;
              const newContact: Contact = {
                  id: newId,
                  name: senderInfo.name || "Unknown",
                  avatar: senderInfo.avatar || 'https://picsum.photos/200',
                  isAi: false,
                  peerId: senderInfo.id, 
                  lastMessage: message.type === MessageType.TEXT ? message.content : `[${message.type}]`,
                  lastMessageTime: Date.now()
              };
              return [...prev, newContact];
          }
      });

      setTimeout(() => {
        setContacts(currentContacts => {
            const contact = currentContacts.find(c => c.peerId === senderInfo.id || c.name === senderInfo.name);
            const resolvedContactId = contact ? contact.id : `p2p_${senderInfo.id}`;
            
            const incomingMsg: Message = {
                ...message,
                senderId: resolvedContactId, // Force sender ID to match contact ID locally
                status: 'read' // Mark incoming as read for now
            };

            setMessagesMap(prevMsgs => ({
                ...prevMsgs,
                [resolvedContactId]: [...(prevMsgs[resolvedContactId] || []), incomingMsg]
            }));
            return currentContacts;
        });
      }, 0);
  };

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    if (id !== 'new_friends' && id !== 'group_create') {
        setCurrentTab('chat'); 
    }
  };

  const handleTabChange = (tab: TabType) => {
      setCurrentTab(tab);
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
      const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));
      const members: User[] = [
          currentUser,
          ...selectedContacts.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))
      ];

      const newGroup: Contact = {
          id: newGroupId,
          name: name,
          avatar: 'https://picsum.photos/id/10/200/200',
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
      const isPeerId = id && id.length > 10;
      const newId = isPeerId ? `p2p_${id}` : (id || `user_${Date.now()}`);
      
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
          isAi: false,
          peerId: isPeerId ? id : undefined 
      };
      
      if (isPeerId) {
          p2pService.connectToPeer(id!);
      }

      setContacts(prev => [...prev, newContact]);
      
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

  const handleDeleteChat = useCallback((contactId: string) => {
      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setMessagesMap(prev => {
          const newMap = { ...prev };
          delete newMap[contactId];
          return newMap;
      });
      setActiveContactId('');
      
      // Also explicitly remove from DB for thoroughness, although saving the state would overwrite it.
      // Since we overwrite contacts list, that part is fine. 
      // For messages, we must explicitly delete the key because we use bulk put or specific put.
      if (isDbLoaded) {
          dbService.deleteMessagesForContact(contactId);
      }
  }, [isDbLoaded]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!activeContactId) return;

    const currentMessages = messagesMap[activeContactId] || [];
    const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
    
    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: updatedMessages
    }));

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

    // 2. P2P Sending Logic
    const currentContact = contacts.find(c => c.id === activeContactId);
    if (currentContact?.peerId) {
        const p2pMsg = { ...newMessage, senderId: myPeerId };
        p2pService.sendMessage(currentContact.peerId, p2pMsg, { ...currentUser, id: myPeerId });
        
        setTimeout(() => {
            setMessagesMap(prev => ({
                ...prev,
                [activeContactId]: prev[activeContactId].map(m => m.id === newMessageId ? { ...m, status: 'sent' } : m)
            }));
        }, 500);
        return; 
    }


    // 3. AI/Local Audio Transcription (Existing Logic)
    if (type === MessageType.AUDIO) {
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

    // Simulate Sending Delay -> Mark as SENT (For non-P2P)
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

    // 4. AI Reply Logic
    const shouldAiReply = currentContact?.isAi || (currentContact?.isGroup && currentContact?.hasAiActive);

    if (shouldAiReply) {
      setTypingMap(prev => ({ ...prev, [activeContactId]: true }));
      const history = messagesMap[activeContactId] || [];
      const fullHistory = [...history, newMessage];

      try {
        const aiReplyText = await getGeminiReply(fullHistory, currentContact?.name || "Chat", currentContact?.isGroup);

        setMessagesMap(prev => {
            const currentMessages = prev[activeContactId] || [];
            const updatedMessages = currentMessages.map(msg => 
                msg.id === newMessageId ? { ...msg, status: 'read' as const } : msg
            );

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
  }, [activeContactId, contacts, messagesMap, myPeerId, currentUser]);

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = activeContactId ? (messagesMap[activeContactId] || []) : [];
  const isTyping = activeContactId ? (typingMap[activeContactId] || false) : false;

  let mainContent;

  if (currentTab === 'moments') {
      mainContent = (
        <div className="flex flex-col w-full h-full relative">
             <div className="md:hidden absolute top-4 left-4 z-50">
               <button onClick={() => handleTabChange('chat')} className="bg-gray-200 p-2 rounded-full text-gray-600">← 返回</button>
            </div>
            <Moments currentUser={currentUser} moments={moments} onAddMoment={handleAddMoment} onAddComment={handleAddComment} onLikeMoment={handleLikeMoment}/>
        </div>
      );
  } else if (currentTab === 'stickers') {
      mainContent = <StickerManager stickers={customStickers} onAddSticker={handleAddSticker} onDeleteSticker={handleDeleteSticker} onReorderStickers={handleReorderStickers}/>;
  } else if (activeContactId === 'new_friends') {
      mainContent = <NewFriends onAddContact={handleAddContact} />;
  } else if (activeContactId === 'group_create') {
      mainContent = <GroupCreator contacts={contacts} currentUser={currentUser} onCreateGroup={handleCreateGroup} onCancel={() => { setActiveContactId(''); setCurrentTab('chat'); }}/>;
  } else if (activeContact) {
      mainContent = (
        <div className="flex flex-col w-full h-full relative">
          <div className="md:hidden absolute top-4 left-4 z-50">
             <button onClick={() => setActiveContactId('')} className="bg-gray-200 p-2 rounded-full text-gray-600">← 返回</button>
          </div>
          <ChatWindow activeContact={activeContact} messages={currentMessages} currentUserAvatar={currentUser.avatar} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} onToggleGroupAi={toggleGroupAi} onAddMember={handleAddMember} onUpdateContactAvatar={handleUpdateContactAvatar} onDeleteChat={handleDeleteChat} isTyping={isTyping} stickers={customStickers}/>
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
      <div className="flex w-full h-full md:w-[1000px] md:h-[800px] md:rounded-lg overflow-hidden shadow-2xl bg-[#f5f5f5]">
        <div className={`${(activeContactId || currentTab === 'moments' || currentTab === 'stickers') ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
          <Sidebar contacts={contacts} activeContactId={activeContactId} onSelectContact={handleSelectContact} currentTab={currentTab} onTabChange={handleTabChange} onAddContact={(name) => handleAddContact(name)} onStartGroupChat={handleStartGroupChat} hasNewMoments={hasNewMoments} currentUser={currentUser} onUpdateUserAvatar={handleUpdateUserAvatar} myPeerId={myPeerId} />
        </div>
        <div className={`${(!activeContactId && currentTab !== 'moments' && currentTab !== 'stickers') ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
          {mainContent}
        </div>
      </div>
    </div>
  );
};

export default App;
