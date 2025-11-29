import React from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Moments from './components/Moments';
import GroupCreator from './components/GroupCreator';
import NewFriends from './components/NewFriends';
import { Contact, Message, MessageType, User, Moment as MomentType, Comment } from './types';
import { getGeminiReply } from './services/geminiService';

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

  const [currentUser, setCurrentUser] = React.useState<User>(FALLBACK_USER);
  const [contacts, setContacts] = React.useState<Contact[]>(INITIAL_CONTACTS);
  const [messagesMap, setMessagesMap] = React.useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [activeContactId, setActiveContactId] = React.useState<string>('1');
  const [currentTab, setCurrentTab] = React.useState<TabType>('chat');
  const [moments, setMoments] = React.useState<MomentType[]>(INITIAL_MOMENTS);
  const [isTyping, setIsTyping] = React.useState<boolean>(false);
  const [showGroupCreator, setShowGroupCreator] = React.useState<boolean>(false);
  const [showNewFriends, setShowNewFriends] = React.useState<boolean>(false);

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

  const handleAddContact = (name: string, id?: string) => {
    const newContactId = id || `contact_${Date.now()}`;
    const newContact: Contact = {
      id: newContactId,
      name,
      avatar: `https://picsum.photos/seed/${newContactId}/200`,
      isAi: false
    };

    setContacts(prev => [...prev, newContact]);
    setMessagesMap(prev => ({ ...prev, [newContactId]: [] }));
  };

  const handleSendMessage = async (content: string, type: MessageType) => {
    if (!activeContactId) return;

    // Create and add user message
    const newMessageId = Date.now().toString();
    const newMessage: Message = {
      id: newMessageId,
      content,
      senderId: 'me',
      timestamp: Date.now(),
      type,
      status: 'sending'
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMessage]
    }));

    // Update message status to sent
    setMessagesMap(prev => ({
      ...prev,
      [activeContactId]: prev[activeContactId]?.map(msg =>
        msg.id === newMessageId ? { ...msg, status: 'sent' } : msg
      ) || []
    }));

    const activeContact = contacts.find(c => c.id === activeContactId);
    if (activeContact?.isAi) {
      setIsTyping(true);

      // Get all messages including the new one
      const allMessages = [...(messagesMap[activeContactId] || []), newMessage];

      try {
        // Call Gemini API for response
        const reply = await getGeminiReply(allMessages, activeContact.name);

        // Create and add AI reply
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
    }
  };

  const handleAddMoment = (content: string, images: string[], video?: string) => {
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
              onUpdateUserAvatar={() => console.log('Update user avatar')}
              myPeerId=""
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
            />
          ) : activeContact && currentTab === 'chat' ? (
            <div className="flex flex-col w-full h-full">
              <ChatWindow
                activeContact={activeContact}
                messages={currentMessages}
                currentUserAvatar={currentUser.avatar}
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