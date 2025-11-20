import React, { useState } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';

interface NewFriendsProps {
  onAddContact: (name: string, id?: string) => void;
}

const NewFriends: React.FC<NewFriendsProps> = ({ onAddContact }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, id: string, avatar: string} | null>(null);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);

    // Simulate API search delay
    setTimeout(() => {
      setIsSearching(false);
      // Mock result based on search term
      setSearchResult({
        name: searchTerm, // Use the search term as the name for this demo
        id: `new_user_${Date.now()}`,
        avatar: `https://picsum.photos/seed/${searchTerm}/200`
      });
    }, 800);
  };

  const handleAdd = () => {
    if (searchResult) {
      onAddContact(searchResult.name, searchResult.id);
      setSearchTerm('');
      setSearchResult(null);
      alert(`已添加 ${searchResult.name} 为好友`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSearch();
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f5f5f5]">
      <div className="h-16 border-b border-[#e7e7e7] flex items-center px-6 bg-[#f5f5f5]">
        <span className="font-medium text-[16px] text-black">新的朋友</span>
      </div>

      <div className="p-8 max-w-2xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="微信号/手机号/QQ号" 
            className="w-full bg-white py-3 pl-10 pr-4 rounded-md border border-gray-200 focus:outline-none focus:border-[#07c160] transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
             onClick={handleSearch}
             className="absolute right-2 top-1.5 px-4 py-1.5 bg-[#07c160] text-white rounded text-sm hover:bg-[#06ad56] disabled:opacity-50"
             disabled={!searchTerm.trim() || isSearching}
          >
             搜索
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col items-center">
            {isSearching ? (
                <div className="flex flex-col items-center mt-10 text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-sm">正在查找...</span>
                </div>
            ) : searchResult ? (
                <div className="w-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center animate-fade-in-up">
                    <img 
                        src={searchResult.avatar} 
                        alt={searchResult.name} 
                        className="w-16 h-16 rounded-md object-cover"
                    />
                    <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-black">{searchResult.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">地区: 未知</p>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="px-6 py-2 bg-[#ededed] text-[#07c160] font-medium rounded hover:bg-[#e1e1e1] transition-colors flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        添加到通讯录
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center mt-20 opacity-40">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mb-4">
                        <Search size={32} className="text-white" />
                    </div>
                    <p className="text-gray-500">搜索添加新朋友</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default NewFriends;
