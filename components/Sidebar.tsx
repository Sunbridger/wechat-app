import React from 'react';
import { MessageCircle, Users, Folder, Search, Plus } from 'lucide-react';
import { Contact } from '../types';

export type TabType = 'chat' | 'contacts' | 'files';

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string | null;
  onSelectContact: (id: string) => void;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  activeContactId, 
  onSelectContact,
  currentTab,
  onTabChange
}) => {
  
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Filter logic based on tab
  const renderContent = () => {
    if (currentTab === 'chat') {
      // Only show contacts that have messages or are recent (for demo we show all in chat tab provided)
      return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.sort((a,b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)).map((contact) => (
            <div 
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
              className={`flex items-center p-3 cursor-pointer transition-colors ${
                activeContactId === contact.id ? 'bg-[#c6c6c6]' : 'hover:bg-[#dcdcdc]'
              }`}
            >
              <img 
                src={contact.avatar} 
                alt={contact.name} 
                className="w-10 h-10 rounded-md object-cover"
              />
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-[14px] font-normal text-black truncate">{contact.name}</h3>
                  <span className="text-[10px] text-gray-400">{formatTime(contact.lastMessageTime)}</span>
                </div>
                <p className="text-[12px] text-gray-500 truncate">
                  {contact.lastMessage || "暂无消息"}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (currentTab === 'contacts') {
      // Simple A-Z list simulation
      const sortedContacts = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
      return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2 text-xs text-gray-400">通讯录</div>
             {sortedContacts.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => onSelectContact(contact.id)} // Switch to chat when clicking contact
              className="flex items-center p-3 cursor-pointer hover:bg-[#dcdcdc] border-b border-[#e7e7e7]"
            >
              <img 
                src={contact.avatar} 
                alt={contact.name} 
                className="w-9 h-9 rounded-md object-cover"
              />
              <div className="ml-3 flex-1 min-w-0">
                 <h3 className="text-[14px] font-normal text-black">{contact.name}</h3>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
        // Files / Favorites Tab
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 text-center">
                <div className="mt-10 opacity-50">
                    <Folder size={48} className="mx-auto mb-4 text-gray-400"/>
                    <p className="text-sm text-gray-500">文件管理助手</p>
                    <p className="text-xs text-gray-400 mt-2">暂无文件传输记录</p>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full md:w-80 border-r border-[#d6d6d6] bg-[#f7f7f7]">
      {/* Narrow Icon Bar (Dark) */}
      <div className="w-[60px] bg-[#2e2e2e] flex flex-col items-center py-4 flex-shrink-0 text-[#969696]">
        <img 
          src="https://picsum.photos/id/64/200/200" 
          alt="我" 
          className="w-9 h-9 rounded-md mb-6 border border-[#4a4a4a]"
        />
        <div className="flex flex-col gap-6">
          <button 
            onClick={() => onTabChange('chat')}
            className={`transition-colors ${currentTab === 'chat' ? 'text-[#07c160]' : 'hover:text-white'}`}
          >
            <MessageCircle size={24} strokeWidth={1.5} fill={currentTab === 'chat' ? '#07c160' : 'none'} className={currentTab === 'chat' ? 'text-transparent' : ''} />
          </button>
          <button 
            onClick={() => onTabChange('contacts')}
            className={`transition-colors ${currentTab === 'contacts' ? 'text-[#07c160]' : 'hover:text-white'}`}
          >
            <Users size={24} strokeWidth={1.5} fill={currentTab === 'contacts' ? '#07c160' : 'none'} className={currentTab === 'contacts' ? 'text-transparent' : ''} />
          </button>
          <button 
            onClick={() => onTabChange('files')}
            className={`transition-colors ${currentTab === 'files' ? 'text-[#07c160]' : 'hover:text-white'}`}
          >
            <Folder size={24} strokeWidth={1.5} fill={currentTab === 'files' ? '#07c160' : 'none'} className={currentTab === 'files' ? 'text-transparent' : ''} />
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 flex flex-col bg-[#f7f7f7]">
        {/* Search Bar */}
        <div className="h-16 flex items-center px-3 bg-[#f7f7f7] gap-2 flex-shrink-0">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search size={14} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="搜索" 
              className="w-full bg-[#e2e2e2] text-xs py-1.5 pl-8 pr-2 rounded-[4px] focus:outline-none border border-transparent focus:border-[#d1d1d1] text-gray-700 placeholder-gray-500"
            />
          </div>
          <button className="bg-[#e2e2e2] p-1.5 rounded-[4px] text-gray-600 hover:bg-[#d1d1d1]">
            <Plus size={14} />
          </button>
        </div>

        {/* Dynamic Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Sidebar;