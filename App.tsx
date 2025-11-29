import React from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { Contact, Message, MessageType, User } from './types';

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

const App: React.FC = () => {
  console.log('App component initialized');

  const [currentUser, setCurrentUser] = React.useState<User>(FALLBACK_USER);
  const [contacts, setContacts] = React.useState<Contact[]>(INITIAL_CONTACTS);
  const [messagesMap, setMessagesMap] = React.useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [activeContactId, setActiveContactId] = React.useState<string>('1');
  const [currentTab, setCurrentTab] = React.useState<TabType>('chat');

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    setCurrentTab('chat');
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
  };

  const handleSendMessage = (content: string, type: MessageType) => {
    if (!activeContactId) return;
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
  };

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = activeContactId ? (messagesMap[activeContactId] || []) : [];

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#e5e5e5] overflow-hidden relative">
      <div className="flex w-full h-full md:w-[1000px] md:h-[85vh] md:max-h-[800px] md:rounded-lg overflow-hidden shadow-2xl bg-[#f5f5f5]">
        <div className="flex w-full md:w-auto h-full">
          <Sidebar
            contacts={contacts}
            activeContactId={activeContactId}
            onSelectContact={handleSelectContact}
            currentTab={currentTab}
            onTabChange={handleTabChange}
            onAddContact={(name) => console.log('Add contact:', name)}
            onStartGroupChat={() => console.log('Start group chat')}
            hasNewMoments={false}
            currentUser={currentUser}
            onUpdateUserAvatar={() => console.log('Update user avatar')}
            myPeerId=""
          />
        </div>
        <div className="flex flex-1 h-full">
          {activeContact ? (
            <div className="flex flex-col w-full h-full">
              <ChatWindow
                activeContact={activeContact}
                messages={currentMessages}
                currentUserAvatar={currentUser.avatar}
                onSendMessage={handleSendMessage}
                onDeleteMessage={() => console.log('Delete message')}
                isTyping={false}
                stickers={[]}
                onBack={() => setActiveContactId('')}
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

export default App