
import React, { useState } from 'react';
import { Search, Check, X, User as UserIcon } from 'lucide-react';
import { Contact, User } from '../types';

interface GroupCreatorProps {
  contacts: Contact[];
  currentUser: User;
  onCreateGroup: (name: string, selectedContactIds: string[]) => void;
  onCancel: () => void;
}

const GroupCreator: React.FC<GroupCreatorProps> = ({ contacts, currentUser, onCreateGroup, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');

  // Filter valid contacts for group (exclude AI, existing groups, new_friends)
  const validContacts = contacts.filter(c => !c.isAi && !c.isGroup && c.id !== 'new_friends');
  
  const filteredContacts = validContacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (selectedIds.length === 0) return;
    
    // Auto-generate name if empty
    let finalName = groupName.trim();
    if (!finalName) {
        const selectedNames = validContacts
            .filter(c => selectedIds.includes(c.id))
            .map(c => c.name);
        // Include current user in count logic if desired, but typically group name is peers
        const names = [currentUser.name, ...selectedNames];
        finalName = names.join('、').slice(0, 20) + (names.join('、').length > 20 ? '...' : '');
    }

    onCreateGroup(finalName, selectedIds);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f5f5f5]">
      {/* Header */}
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5] flex-shrink-0">
        <button onClick={onCancel} className="text-gray-600 hover:text-black p-2">
          ←
        </button>
        <span className="font-medium text-[16px] text-black">发起群聊</span>
        <button 
          onClick={handleCreate}
          disabled={selectedIds.length === 0}
          className={`px-4 py-1.5 rounded-[4px] text-[14px] text-white transition-colors ${selectedIds.length > 0 ? 'bg-[#07c160]' : 'bg-gray-300'}`}
        >
          完成({selectedIds.length})
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Contact List */}
        <div className="flex-1 flex flex-col border-r border-[#e7e7e7] overflow-hidden">
           {/* Search */}
           <div className="p-4 pb-2">
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={16} className="text-gray-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="搜索" 
                 className="w-full bg-white py-1.5 pl-9 pr-4 rounded-[4px] border border-gray-200 focus:outline-none focus:border-[#07c160] text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
           </div>

           {/* List */}
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredContacts.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10 text-sm">没有找到联系人</div>
              ) : (
                  <div className="px-4">
                      {filteredContacts.map(contact => {
                          const isSelected = selectedIds.includes(contact.id);
                          return (
                              <div 
                                key={contact.id}
                                onClick={() => toggleSelection(contact.id)}
                                className="flex items-center py-3 border-b border-gray-100 cursor-pointer last:border-0"
                              >
                                  {/* Checkbox */}
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-[#07c160] border-[#07c160]' : 'border-gray-300'}`}>
                                      {isSelected && <Check size={12} className="text-white" />}
                                  </div>
                                  
                                  <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-[4px] object-cover" />
                                  <span className="ml-3 text-sm text-black">{contact.name}</span>
                              </div>
                          );
                      })}
                  </div>
              )}
           </div>
        </div>

        {/* Right: Selected & Settings */}
        <div className="w-64 flex flex-col bg-white p-6">
            <div className="mb-6">
                <label className="block text-xs text-gray-400 mb-2">群名称 (可选)</label>
                <input 
                    type="text" 
                    placeholder="取个群名字"
                    className="w-full border-b border-gray-200 py-1 text-sm focus:outline-none focus:border-[#07c160]"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="text-xs text-gray-400 mb-3">已选择联系人: {selectedIds.length}</div>
                <div className="grid grid-cols-3 gap-3">
                    {validContacts.filter(c => selectedIds.includes(c.id)).map(c => (
                        <div key={c.id} className="flex flex-col items-center relative group">
                             <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-[4px] object-cover" />
                             <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{c.name}</span>
                             <button 
                                onClick={() => toggleSelection(c.id)}
                                className="absolute -top-1 -right-1 bg-gray-400 text-white rounded-full p-0.5 hover:bg-red-500 hidden group-hover:block"
                             >
                                 <X size={10} />
                             </button>
                        </div>
                    ))}
                    {selectedIds.length === 0 && (
                        <div className="col-span-3 text-center text-gray-300 text-sm py-4">
                            请在左侧选择联系人
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCreator;
