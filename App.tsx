import React from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Moments from './components/Moments';
import GroupCreator from './components/GroupCreator';
import NewFriends from './components/NewFriends';
import AuthPanel from './components/AuthPanel';
import { Contact, Message, MessageType, User, Moment as MomentType, Comment, FriendRequest } from './types';
import { getGeminiReply } from './services/geminiService';
import { p2pService, P2PMessagePayload, P2PStatus } from './services/p2pService';
import { getActiveUser, loginUser, registerUser, logoutUser as clearAuthSession, updateCurrentUserAvatar as persistAvatarChange, buildPeerId, normalizePeerKeyword } from './services/authService';

const FALLBACK_USER: User = {
  id: 'me',
  name: '我',
  avatar: 'https://picsum.photos/id/1/200/200'
};

const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Gemini AI 助手',
    avatar: 'https://picsum.photos/id/5/200/200',
    lastMessage: '你好！我是你的 AI 助手。',
    lastMessageTime: Date.now(),
    isAi: true
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
  ]
};

const INITIAL_MOMENTS: MomentType[] = [
  {
    id: '1',
    author: {
      id: 'me',
      name: '我',
      avatar: 'https://picsum.photos/id/1/200/200'
    },
    content: '今天天气真好！',
    images: ['https://picsum.photos/id/10/800/600'],
    timestamp: Date.now() - 3600000,
    likes: ['朋友1', '朋友2'],
    comments: [
      {
        id: 'c1',
        authorName: '朋友1',
        content: '确实不错！'
      }
    ]
  }
];

const App: React.FC = () => {
  console.log('App component initialized');

  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>(INITIAL_CONTACTS);
  const [messagesMap, setMessagesMap] = React.useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [myPeerId, setMyPeerId] = React.useState<string>('');
  const [p2pStatus, setP2pStatus] = React.useState<P2PStatus>('disconnected');
  const [activeContactId, setActiveContactId] = React.useState<string>('1');
  const [currentTab, setCurrentTab] = React.useState<TabType>('chat');
  const [moments, setMoments] = React.useState<MomentType[]>(INITIAL_MOMENTS);
  const [isTyping, setIsTyping] = React.useState<boolean>(false);
  const [showGroupCreator, setShowGroupCreator] = React.useState<boolean>(false);
  const [showNewFriends, setShowNewFriends] = React.useState<boolean>(false);
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authStatus, setAuthStatus] = React.useState<string | null>(null);
  const [initializing, setInitializing] = React.useState<boolean>(true);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = React.useState<FriendRequest[]>([]);
  type PeerProfile = { id: string; name: string; avatar: string; peerId: string };
  const profileRequestsRef = React.useRef<
    Map<
      string,
      {
        resolve: (profile: PeerProfile) => void;
        reject: (error: Error) => void;
        timeoutId: number;
      }
    >
  >(new Map());
  const formatMessagePreview = React.useCallback((message: Message) => {
    switch (message.type) {
      case MessageType.TEXT:
        return message.content;
      case MessageType.IMAGE:
        return '[图片]';
      case MessageType.AUDIO:
        return '[语音]';
      case MessageType.FILE:
        return message.fileName ? `[文件] ${message.fileName}` : '[文件]';
      default:
        return '[消息]';
    }
  }, []);

  const clearPendingProfileRequests = React.useCallback((reason?: string) => {
    profileRequestsRef.current.forEach(({ reject, timeoutId }) => {
      clearTimeout(timeoutId);
      reject(new Error(reason || '请求已取消'));
    });
    profileRequestsRef.current.clear();
  }, []);

  const requestPeerProfile = React.useCallback(
    (peerKeyword: string) => {
      if (typeof window === 'undefined') {
        return Promise.reject(new Error('当前环境不支持该操作'));
      }
      if (!currentUser) {
        return Promise.reject(new Error('请先登录'));
      }
      const normalized = normalizePeerKeyword(peerKeyword);
      if (!normalized) {
        return Promise.reject(new Error('请输入用户名'));
      }

      // 将用户名转换为Peer ID（使用相同的编码规则）
      const targetPeerId = buildPeerId(normalized, normalized);
      const selfPeerId = currentUser.peerId?.trim() || buildPeerId(currentUser.name, currentUser.id);

      if (targetPeerId === selfPeerId || normalized.toLowerCase() === currentUser.name.toLowerCase()) {
        return Promise.resolve({
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          peerId: selfPeerId
        });
      }

      const requestId = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return new Promise<PeerProfile>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          profileRequestsRef.current.delete(requestId);
          reject(new Error('对方暂未响应，可能不在线'));
        }, 5000);
        profileRequestsRef.current.set(requestId, { resolve, reject, timeoutId });

        // 使用转换后的Peer ID发送请求
        console.log(`Searching for user "${normalized}" with Peer ID: ${targetPeerId}`);
        p2pService.sendPayloadToPeer(targetPeerId, {
          type: 'USER_INFO_REQUEST',
          requestId,
          senderInfo: currentUser
        });
      });
    },
    [currentUser]
  );

  React.useEffect(() => {
    const storedUser = getActiveUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    setInitializing(false);
  }, []);

  React.useEffect(() => {
    setAuthError(null);
  }, [authMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentUser) {
      p2pService.destroy();
      clearPendingProfileRequests('用户已退出');
      setMyPeerId('');
      setP2pStatus('disconnected');
      return;
    }

    // 使用buildPeerId确保Peer ID格式有效
    const desiredPeerId = currentUser.peerId?.trim() || buildPeerId(currentUser.name, currentUser.id);
    setMyPeerId(desiredPeerId);
    const currentProfile: PeerProfile = {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      peerId: desiredPeerId
    };

    const handleIncoming = (payload: P2PMessagePayload) => {
      const remotePeerId =
        payload.peerId ||
        payload.senderInfo.peerId ||
        payload.senderInfo.name?.trim() ||
        payload.senderInfo.id;

      if (payload.type === 'USER_INFO_RESPONSE' && payload.requestId) {
        const pending = profileRequestsRef.current.get(payload.requestId);
        if (pending) {
          const profile = payload.profile || {
            id: payload.senderInfo.id,
            name: payload.senderInfo.name,
            avatar: payload.senderInfo.avatar,
            peerId: remotePeerId
          };
          clearTimeout(pending.timeoutId);
          profileRequestsRef.current.delete(payload.requestId);
          pending.resolve({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            peerId: profile.peerId || remotePeerId
          });
        }
        return;
      }

      if (payload.type === 'USER_INFO_REQUEST') {
        if (!remotePeerId) return;
        p2pService.sendPayloadToPeer(remotePeerId, {
          type: 'USER_INFO_RESPONSE',
          requestId: payload.requestId,
          senderInfo: currentUser,
          profile: currentProfile
        });
        return;
      }

      if (payload.type === 'FRIEND_REQUEST' && payload.friendRequest) {
        const request = payload.friendRequest;
        console.log('收到好友请求:', request, 'from peerId:', remotePeerId);
        setFriendRequests(prev => {
          const exists = prev.find(r => r.id === request.id);
          if (exists) {
            console.log('好友请求已存在，跳过');
            return prev;
          }
          console.log('添加新的好友请求到列表');
          return [...prev, request];
        });
        return;
      }

      if (payload.type === 'FRIEND_REQUEST_RESPONSE' && payload.friendRequest) {
        const request = payload.friendRequest;
        const accepted = payload.accepted;

        setSentFriendRequests(prev =>
          prev.map(r => r.id === request.id ? { ...r, status: accepted ? 'accepted' : 'rejected' } : r)
        );

        if (accepted) {
          const newContact: Contact = {
            id: remotePeerId || request.fromUser.peerId || '',
            name: request.fromUser.name,
            avatar: request.fromUser.avatar,
            isAi: false,
            peerId: remotePeerId || request.fromUser.peerId,
          };
          setContacts(prev => {
            const exists = prev.find(c => c.peerId === newContact.peerId);
            if (exists) return prev;
            return [...prev, newContact];
          });
          alert(`${request.fromUser.name} 已接受你的好友请求`);
        } else {
          alert(`${request.fromUser.name} 拒绝了你的好友请求`);
        }
        return;
      }

      if (payload.type !== 'CHAT_MESSAGE' || !payload.message) return;

      const peerId = remotePeerId;

      setContacts(prev => {
        const existing = prev.find(contact => contact.id === peerId);
        if (existing) {
          return prev.map(contact =>
            contact.id === peerId
              ? {
                  ...contact,
                  name: contact.name || payload.senderInfo.name,
                  avatar: contact.avatar || payload.senderInfo.avatar,
                  lastMessage: formatMessagePreview(payload.message),
                  lastMessageTime: payload.message.timestamp,
                  peerId
                }
              : contact
          );
        }

        const newContact: Contact = {
          id: peerId,
          name: payload.senderInfo.name || '新的好友',
          avatar: payload.senderInfo.avatar || `https://picsum.photos/seed/${peerId}/200`,
          isAi: false,
          peerId,
          lastMessage: formatMessagePreview(payload.message),
          lastMessageTime: payload.message.timestamp
        };
        return [...prev, newContact];
      });

      setMessagesMap(prev => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), payload.message]
      }));
    };

    p2pService.setOnMessageReceived(handleIncoming);
    p2pService.setOnStatusChange(status => setP2pStatus(status));
    p2pService.init(desiredPeerId);

    return () => {
      p2pService.destroy();
    };
  }, [currentUser, formatMessagePreview, clearPendingProfileRequests]);

  const handleLogin = ({ name, password }: { name: string; password: string }) => {
    const result = loginUser(name, password);
    if (!result.success) {
      setAuthError(result.message);
      setAuthStatus(null);
      return;
    }
    setCurrentUser(result.user);
    setAuthError(null);
    setAuthStatus(null);
  };

  const handleRegister = ({ name, password, avatar }: { name: string; password: string; avatar?: string }) => {
    const result = registerUser({ name, password, avatar });
    if (!result.success) {
      setAuthError(result.message);
      setAuthStatus(null);
      return;
    }
    setAuthMode('login');
    setAuthStatus('注册成功，请登录');
    setAuthError(null);
  };

  const handleLogout = () => {
    clearAuthSession();
    p2pService.destroy();
    clearPendingProfileRequests('已退出登录');
    setMyPeerId('');
    setP2pStatus('disconnected');
    setCurrentUser(null);
    setAuthMode('login');
    setAuthStatus(null);
    setAuthError(null);
  };

  const handleUpdateUserAvatar = (url: string) => {
    if (!currentUser) return;
    const updated = persistAvatarChange(url) || { ...currentUser, avatar: url || currentUser.avatar };
    setCurrentUser(updated);
  };

  const handleSelectContact = (id: string) => {
    if (id === 'new_friends') {
      setShowNewFriends(true);
    } else {
      setActiveContactId(id);
      setCurrentTab('chat');
    }
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
  };

  const handleStartGroupChat = () => {
    setShowGroupCreator(true);
  };

  const handleCreateGroup = (name: string, selectedContactIds: string[]) => {
    const newGroupId = `group_${Date.now()}`;
    const newGroup: Contact = {
      id: newGroupId,
      name,
      avatar: `https://picsum.photos/seed/${newGroupId}/200`,
      isAi: false,
      isGroup: true,
      members: selectedContactIds.map(id => {
        const contact = contacts.find(c => c.id === id);
        return contact ? { id: contact.id, name: contact.name, avatar: contact.avatar } : { id: '', name: '', avatar: '' };
      })
    };

    setContacts(prev => [...prev, newGroup]);
    setMessagesMap(prev => ({ ...prev, [newGroupId]: [] }));
    setShowGroupCreator(false);
  };

  const handleAddContact = (name: string, peerId?: string, avatar?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || !currentUser) return;
    const trimmedPeerId = peerId?.trim();
    if (!trimmedPeerId) {
      alert('无法添加好友：缺少 Peer ID');
      return;
    }

    const existingRequest = sentFriendRequests.find(
      r => r.toUser.peerId === trimmedPeerId && r.status === 'pending'
    );
    if (existingRequest) {
      alert('已经发送过好友请求，请等待对方确认');
      return;
    }

    const request: FriendRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromUser: currentUser,
      toUser: {
        id: trimmedPeerId,
        name: trimmedName,
        avatar: avatar || `https://picsum.photos/seed/${trimmedPeerId}/200`,
        peerId: trimmedPeerId
      },
      message: '你好，我想添加你为好友',
      timestamp: Date.now(),
      status: 'pending'
    };

    setSentFriendRequests(prev => [...prev, request]);
    console.log('发送好友请求到 Peer ID:', trimmedPeerId, '请求内容:', request);
    p2pService.sendFriendRequest(trimmedPeerId, request);
    alert(`好友请求已发送给 ${trimmedName}，等待对方确认`);
  };

  const handleAcceptFriendRequest = (request: FriendRequest) => {
    if (!currentUser) return;

    setFriendRequests(prev =>
      prev.map(r => r.id === request.id ? { ...r, status: 'accepted' } : r)
    );

    const newContact: Contact = {
      id: request.fromUser.peerId || request.fromUser.id,
      name: request.fromUser.name,
      avatar: request.fromUser.avatar,
      isAi: false,
      peerId: request.fromUser.peerId
    };

    setContacts(prev => {
      const exists = prev.find(c => c.peerId === newContact.peerId);
      if (exists) return prev;
      return [...prev, newContact];
    });

    setMessagesMap(prev => ({
      ...prev,
      [newContact.id]: []
    }));

    p2pService.sendFriendRequestResponse(
      request.fromUser.peerId || '',
      request,
      true,
      currentUser
    );
  };

  const handleRejectFriendRequest = (request: FriendRequest) => {
    if (!currentUser) return;

    setFriendRequests(prev =>
      prev.map(r => r.id === request.id ? { ...r, status: 'rejected' } : r)
    );

    p2pService.sendFriendRequestResponse(
      request.fromUser.peerId || '',
      request,
      false,
      currentUser
    );
  };

  const handleSearchUserProfile = React.useCallback(
    async (keyword: string) => {
      console.log('handleSearchUserProfile: 搜索关键词:', keyword);
      const profile = await requestPeerProfile(keyword);
      console.log('handleSearchUserProfile: 搜索结果:', profile);
      return {
        name: profile.name,
        peerId: profile.peerId,
        avatar: profile.avatar
      };
    },
    [requestPeerProfile]
  );

  const handleSendMessage = async (content: string, type: MessageType, options?: { duration?: number; fileName?: string; fileSize?: string }) => {
    if (!currentUser || !activeContactId) return;

    const timestamp = Date.now();
    const newMessageId = timestamp.toString();
    const baseMessage: Message = {
      id: newMessageId,
      content,
      senderId: currentUser.id,
      senderName: currentUser.name,
      timestamp,
      type,
      status: 'sending',
      audioDuration: options?.duration,
      fileName: options?.fileName,
      fileSize: options?.fileSize
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), baseMessage]
    }));

    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: prev[activeContactId]?.map(msg =>
        msg.id === newMessageId ? { ...msg, status: 'sent' } : msg
      ) || []
    }));

    const preview = formatMessagePreview({ ...baseMessage, status: 'sent' });

    setContacts(prev =>
      prev.map(contact =>
        contact.id === activeContactId
          ? { ...contact, lastMessage: preview, lastMessageTime: timestamp }
          : contact
      )
    );

    const activeContact = contacts.find(c => c.id === activeContactId);
    if (activeContact?.isAi) {
      setIsTyping(true);
      const allMessages = [...(messagesMap[activeContactId] || []), baseMessage];

      try {
        const reply = await getGeminiReply(allMessages, activeContact.name, !!activeContact.isGroup, currentUser.id);
        const aiReplyId = (Date.now() + 1).toString();
        const aiReply: Message = {
          id: aiReplyId,
          content: reply,
          senderId: activeContactId,
          timestamp: Date.now(),
          type: MessageType.TEXT,
          status: 'read'
        };

        setMessagesMap(prev => ({
          ...prev,
          [activeContactId]: [...(prev[activeContactId] || []), aiReply]
        }));
      } catch (error) {
        console.error('Error getting AI reply:', error);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const peerId = activeContact?.peerId || (activeContact?.isGroup ? undefined : activeContactId);
    if (activeContact && !activeContact.isAi && !activeContact.isGroup && peerId) {
      p2pService.sendMessage(peerId, { ...baseMessage, status: 'sent' }, currentUser);
    }
  };

  const handleAddMoment = (content: string, images: string[], video?: string) => {
    if (!currentUser) return;
    const newMoment: MomentType = {
      id: Date.now().toString(),
      author: currentUser,
      content,
      images,
      video,
      timestamp: Date.now(),
      likes: [],
      comments: []
    };
    setMoments(prev => [newMoment, ...prev]);
  };

  const handleAddComment = (momentId: string, content: string) => {
    if (!currentUser) return;
    setMoments(prev => prev.map(moment => {
      if (moment.id === momentId) {
        const newComment: Comment = {
          id: Date.now().toString(),
          authorName: currentUser.name,
          content
        };
        return {
          ...moment,
          comments: [...moment.comments, newComment]
        };
      }
      return moment;
    }));
  };

  const handleLikeMoment = (momentId: string) => {
    if (!currentUser) return;
    setMoments(prev => prev.map(moment => {
      if (moment.id === momentId) {
        const isLiked = moment.likes.includes(currentUser.name);
        return {
          ...moment,
          likes: isLiked
            ? moment.likes.filter(name => name !== currentUser.name)
            : [...moment.likes, currentUser.name]
        };
      }
      return moment;
    }));
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#e5e5e5]">
        <p className="text-gray-500 text-sm">加载中...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPanel
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={authError}
        status={authStatus}
      />
    );
  }

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = activeContactId ? (messagesMap[activeContactId] || []) : [];

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#e5e5e5] overflow-hidden relative">
      <div className="flex w-full h-full md:w-[1000px] md:h-[85vh] md:max-h-[800px] md:rounded-lg overflow-hidden shadow-2xl bg-[#f5f5f5]">
        {!showGroupCreator && !showNewFriends && (
          <div className="flex w-full md:w-auto h-full">
            <Sidebar
              contacts={contacts}
              activeContactId={activeContactId}
              onSelectContact={handleSelectContact}
              currentTab={currentTab}
              onTabChange={handleTabChange}
              onAddContact={handleAddContact}
              onStartGroupChat={handleStartGroupChat}
              hasNewMoments={false}
              currentUser={currentUser}
              onUpdateUserAvatar={handleUpdateUserAvatar}
              myPeerId={myPeerId}
              p2pStatus={p2pStatus}
              onLogout={handleLogout}
              pendingFriendRequestsCount={friendRequests.filter(r => r.status === 'pending').length}
            />
          </div>
        )}
        <div className="flex flex-1 h-full">
          {showGroupCreator ? (
            <GroupCreator
              contacts={contacts}
              currentUser={currentUser}
              onCreateGroup={handleCreateGroup}
              onCancel={() => setShowGroupCreator(false)}
            />
          ) : showNewFriends ? (
            <NewFriends
              onAddContact={handleAddContact}
              onBack={() => setShowNewFriends(false)}
              onSearchUser={handleSearchUserProfile}
              myPeerId={myPeerId}
              myUsername={currentUser?.name}
              friendRequests={friendRequests}
              sentFriendRequests={sentFriendRequests}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onRejectFriendRequest={handleRejectFriendRequest}
            />
          ) : activeContact && currentTab === 'chat' ? (
            <div className="flex flex-col w-full h-full">
              <ChatWindow
                activeContact={activeContact}
                messages={currentMessages}
                currentUserAvatar={currentUser.avatar}
                currentUserId={currentUser.id}
                onSendMessage={handleSendMessage}
                onDeleteMessage={() => console.log('Delete message')}
                isTyping={isTyping}
                stickers={[]}
                onBack={() => setActiveContactId('')}
              />
            </div>
          ) : currentTab === 'moments' ? (
            <Moments
              currentUser={currentUser}
              moments={moments}
              onAddMoment={handleAddMoment}
              onAddComment={handleAddComment}
              onLikeMoment={handleLikeMoment}
            />
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

export default App