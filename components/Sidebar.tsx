
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Users, Folder, Search, Plus, UserPlus, Users as UsersIcon, Tag, Aperture, Smile } from 'lucide-react';
import { Contact } from '../types';

export type TabType = 'chat' | 'contacts' | 'moments' | 'files' | 'stickers';

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string | null;
  onSelectContact: (id: string) => void;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddContact?: (name: string) => void; // Kept for compatibility, but sidebar logic updated
  hasNewMoments?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  activeContactId, 
  onSelectContact,
  currentTab,
  onTabChange,
  hasNewMoments
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleNewFriendsClick = () => {
    onSelectContact('new_friends');
    setMenuOpen(false);
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
            {/* Function Keys */}
            <div className="mt-2 mb-2">
                <div 
                    onClick={handleNewFriendsClick}
                    className={`flex items-center px-3 py-2.5 cursor-pointer transition-colors ${activeContactId === 'new_friends' ? 'bg-[#c6c6c6]' : 'hover:bg-[#dcdcdc]'}`}
                >
                    <div className="w-9 h-9 rounded-md bg-[#fa9d3b] flex items-center justify-center text-white">
                        <UserPlus size={20} fill="white" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0 border-b border-[#e7e7e7] pb-2.5 flex items-center">
                         <h3 className="text-[14px] font-normal text-black">新的朋友</h3>
                    </div>
                </div>
                <div className="flex items-center px-3 py-2.5 cursor-pointer hover:bg-[#dcdcdc]">
                    <div className="w-9 h-9 rounded-md bg-[#07c160] flex items-center justify-center text-white">
                        <UsersIcon size={20} fill="white" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0 border-b border-[#e7e7e7] pb-2.5 flex items-center">
                         <h3 className="text-[14px] font-normal text-black">群聊</h3>
                    </div>
                </div>
                <div className="flex items-center px-3 py-2.5 cursor-pointer hover:bg-[#dcdcdc]">
                    <div className="w-9 h-9 rounded-md bg-[#2782d7] flex items-center justify-center text-white">
                        <Tag size={20} fill="white" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0 pb-2.5 flex items-center">
                         <h3 className="text-[14px] font-normal text-black">标签</h3>
                    </div>
                </div>
            </div>

            {/* Contact List */}
            <div className="px-4 py-1 text-xs text-gray-400 bg-[#f7f7f7]">常用联系人</div>
             {sortedContacts.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => onSelectContact(contact.id)} // Switch to chat when clicking contact
              className={`flex items-center px-3 py-2.5 cursor-pointer border-b border-[#e7e7e7] transition-colors ${
                activeContactId === contact.id ? 'bg-[#c6c6c6]' : 'hover:bg-[#dcdcdc]'
              }`}
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
    } else if (currentTab === 'moments') {
        // Moments list (just a header in sidebar)
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <div className="mt-2 px-3 py-2.5 cursor-pointer bg-[#c6c6c6]">
                    <div className="flex items-center">
                         <div className="w-9 h-9 rounded-md bg-transparent flex items-center justify-center">
                            <Aperture size={24} className="text-gray-600" />
                         </div>
                         <div className="ml-3 flex-1 min-w-0 flex items-center">
                            <h3 className="text-[14px] font-normal text-black">朋友圈</h3>
                         </div>
                    </div>
                </div>
            </div>
        );
    } else if (currentTab === 'stickers') {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <div className="mt-2 px-3 py-2.5 cursor-pointer bg-[#c6c6c6]">
                    <div className="flex items-center">
                         <div className="w-9 h-9 rounded-md bg-transparent flex items-center justify-center">
                            <Smile size={24} className="text-gray-600" />
                         </div>
                         <div className="ml-3 flex-1 min-w-0 flex items-center">
                            <h3 className="text-[14px] font-normal text-black">自定义表情</h3>
                         </div>
                    </div>
                </div>
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
            title="聊天"
          >
            <MessageCircle size={24} strokeWidth={1.5} fill={currentTab === 'chat' ? '#07c160' : 'none'} className={currentTab === 'chat' ? 'text-transparent' : ''} />
          </button>
          <button 
            onClick={() => onTabChange('contacts')}
            className={`transition-colors ${currentTab === 'contacts' ? 'text-[#07c160]' : 'hover:text-white'}`}
            title="通讯录"
          >
            <Users size={24} strokeWidth={1.5} fill={currentTab === 'contacts' ? '#07c160' : 'none'} className={currentTab === 'contacts' ? 'text-transparent' : ''} />
          </button>
          
          <div className="relative">
            <button 
                onClick={() => onTabChange('moments')}
                className={`transition-colors ${currentTab === 'moments' ? 'text-[#07c160]' : 'hover:text-white'}`}
                title="朋友圈"
            >
                <Aperture size={24} strokeWidth={1.5} className={currentTab === 'moments' ? 'text-[#07c160]' : ''} />
            </button>
            {hasNewMoments && currentTab !== 'moments' && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#fa5151] rounded-full border-2 border-[#2e2e2e]"></div>
            )}
          </div>

          <button 
            onClick={() => onTabChange('stickers')}
            className={`transition-colors ${currentTab === 'stickers' ? 'text-[#07c160]' : 'hover:text-white'}`}
            title="自定义表情"
          >
            <Smile size={24} strokeWidth={1.5} className={currentTab === 'stickers' ? 'text-[#07c160]' : ''} />
          </button>

          <button 
            onClick={() => onTabChange('files')}
            className={`transition-colors ${currentTab === 'files' ? 'text-[#07c160]' : 'hover:text-white'}`}
            title="文件"
          >
            <Folder size={24} strokeWidth={1.5} fill={currentTab === 'files' ? '#07c160' : 'none'} className={currentTab === 'files' ? 'text-transparent' : ''} />
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 flex flex-col bg-[#f7f7f7]">
        {/* Search Bar */}
        <div className="h-16 flex items-center px-3 bg-[#f7f7f7] gap-2 flex-shrink-0 relative">
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
          <button 
            ref={buttonRef}
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-1.5 rounded-[4px] hover:bg-[#d1d1d1] ${menuOpen ? 'bg-[#d1d1d1] text-black' : 'bg-[#e2e2e2] text-gray-600'}`}
          >
            <Plus size={14} />
          </button>

          {/* Header Dropdown */}
          {menuOpen && (
            <div ref={menuRef} className="absolute top-14 right-2 w-32 bg-[#2e2e2e] rounded-md shadow-lg py-1 z-50 animate-fade-in-up">
                <button onClick={handleNewFriendsClick} className="w-full text-left px-4 py-2 text-white hover:bg-[#3e3e3e] text-sm flex items-center gap-2">
                    <UserPlus size={16} />
                    <span>添加朋友</span>
                </button>
                <button className="w-full text-left px-4 py-2 text-white hover:bg-[#3e3e3e] text-sm flex items-center gap-2">
                    <MessageCircle size={16} />
                    <span>发起群聊</span>
                </button>
            </div>
          )}
        </div>

        {/* Dynamic Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Sidebar;
