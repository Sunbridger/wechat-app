import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Smile, Paperclip, FolderOpen, Trash2, Mic, Wifi, Loader2, FileText, Plus, Heart, Image as ImageIcon, Search, ArrowLeft, X } from 'lucide-react';
import { Contact, Message, MessageType, Sticker } from '../types';

interface ChatWindowProps {
  activeContact: Contact;
  messages: Message[];
  currentUserAvatar: string;
  onSendMessage: (content: string, type: MessageType, extra?: { duration?: number, fileName?: string, fileSize?: string }) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleGroupAi?: (contactId: string) => void;
  onAddMember?: (contactId: string, name: string) => void;
  onUpdateContactAvatar?: (contactId: string, url: string) => void;
  onDeleteChat?: (contactId: string) => void;
  isTyping: boolean;
  stickers: Sticker[];
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "☺️", 
  "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", 
  "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", 
  "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", 
  "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", 
  "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰",
  "👍", "👎", "👊", "👌", "🤝", "🙏", "👋", "❤️", "💔", "🎉"
];

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  activeContact, 
  messages, 
  currentUserAvatar, 
  onSendMessage,
  onDeleteMessage,
  onToggleGroupAi,
  onAddMember,
  onUpdateContactAvatar,
  onDeleteChat,
  isTyping,
  stickers
}) => {
  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isSearching) {
        scrollToBottom();
    }
  }, [messages, isTyping, activeContact.id, isSearching]);

  // Auto-focus search input when opening search mode
  useEffect(() => {
      if (isSearching && searchInputRef.current) {
          searchInputRef.current.focus();
      }
  }, [isSearching]);

  // Close context menu on clicking anywhere
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
       setContextMenu(null);
       if (settingsMenuOpen && !(e.target as HTMLElement).closest('#settings-container')) {
           setSettingsMenuOpen(false);
       }
       if (showEmojiPicker && !(e.target as HTMLElement).closest('#emoji-container')) {
           setShowEmojiPicker(false);
       }
       if (showStickerPicker && !(e.target as HTMLElement).closest('#sticker-container')) {
           setShowStickerPicker(false);
       }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [settingsMenuOpen, showEmojiPicker, showStickerPicker]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleSendText = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue, MessageType.TEXT);
      setInputValue('');
      setShowEmojiPicker(false);
    }
  };

  const handleSendSticker = (url: string) => {
    onSendMessage(url, MessageType.IMAGE);
    setShowStickerPicker(false);
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId
    });
  };

  const handleConfirmDelete = () => {
    if (contextMenu) {
      onDeleteMessage(contextMenu.messageId);
      setContextMenu(null);
    }
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        
        if (duration < 1) {
          console.log("Recording too short");
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onSendMessage(base64data, MessageType.AUDIO, { duration });
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (base64: string, id: string) => {
    const audio = new Audio(base64);
    audio.onplay = () => setPlayingAudioId(id);
    audio.onended = () => setPlayingAudioId(null);
    audio.onpause = () => setPlayingAudioId(null);
    audio.play();
  };

  const toggleSettings = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSettingsMenuOpen(!settingsMenuOpen);
  };

  const toggleEmojiPicker = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowEmojiPicker(!showEmojiPicker);
      setShowStickerPicker(false);
  };

  const toggleStickerPicker = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowStickerPicker(!showStickerPicker);
      setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: string) => {
      setInputValue(prev => prev + emoji);
  };

  const handleFileUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
          const base64 = reader.result as string;
          const isImage = file.type.startsWith('image/');
          
          // Format file size
          let sizeStr = '';
          if (file.size < 1024) sizeStr = `${file.size} B`;
          else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
          else sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

          onSendMessage(
              base64, 
              isImage ? MessageType.IMAGE : MessageType.FILE, 
              { fileName: file.name, fileSize: sizeStr }
          );
      };
      reader.readAsDataURL(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddMemberClick = () => {
      const name = prompt("请输入新成员的名字：");
      if (name && onAddMember) {
          onAddMember(activeContact.id, name);
      }
  };

  const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpdateContactAvatar) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  onUpdateContactAvatar(activeContact.id, ev.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteChatClick = () => {
      if (window.confirm(activeContact.isGroup ? "确定要删除并退出该群聊吗？" : "确定要删除该聊天吗？")) {
          if (onDeleteChat) {
              onDeleteChat(activeContact.id);
          }
      }
  };

  const handleSearchClick = () => {
      setSettingsMenuOpen(false);
      setIsSearching(true);
      setSearchTerm('');
  };

  // Helper for search highlighting
  const getHighlightedText = (text: string, highlight: string) => {
      if (!highlight.trim()) return <span>{text}</span>;
      
      const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
      return (
          <span>
              {parts.map((part, i) => 
                  part.toLowerCase() === highlight.toLowerCase() ? (
                      <span key={i} className="text-[#07c160] font-bold">{part}</span>
                  ) : (
                      part
                  )
              )}
          </span>
      );
  };

  const filteredMessages = isSearching 
      ? messages.filter(m => {
          if (m.type === MessageType.TEXT) {
              return m.content.toLowerCase().includes(searchTerm.toLowerCase());
          }
          if (m.type === MessageType.AUDIO && m.transcription) {
              return m.transcription.toLowerCase().includes(searchTerm.toLowerCase());
          }
          if (m.type === MessageType.FILE && m.fileName) {
              return m.fileName.toLowerCase().includes(searchTerm.toLowerCase());
          }
          return false;
      })
      : [];

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] w-full relative">
      {/* Header */}
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5] flex-shrink-0 z-10">
        {isSearching ? (
            <div className="flex items-center w-full gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                    </div>
                    <input 
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="搜索聊天记录"
                        className="w-full bg-white text-sm py-1.5 pl-9 pr-4 rounded-[4px] border border-gray-200 focus:outline-none focus:border-[#07c160]"
                    />
                    {searchTerm && (
                         <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600">
                             <div className="bg-gray-200 rounded-full p-0.5">
                                  <X size={12} />
                             </div>
                         </button>
                    )}
                </div>
                <button 
                    onClick={() => setIsSearching(false)}
                    className="text-sm text-gray-600 hover:text-black px-2"
                >
                    取消
                </button>
            </div>
        ) : (
            <>
                <div className="font-medium text-[16px] text-black select-none flex items-center gap-2">
                    {activeContact.name}
                    {activeContact.isGroup && <span className="text-xs text-gray-400">({activeContact.members?.length || 1})</span>}
                </div>
                <div id="settings-container" className="relative">
                    <button onClick={toggleSettings} className="text-gray-600 hover:text-black p-1 rounded hover:bg-gray-200 transition-colors">
                    <MoreHorizontal size={20} />
                    </button>
                    {settingsMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-lg rounded w-64 z-50 animate-fade-in-up">
                            {/* Member Grid for Groups */}
                            {activeContact.isGroup && (
                                <div className="p-4 border-b border-gray-100">
                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                        {activeContact.members?.slice(0, 7).map(member => (
                                            <div key={member.id} className="flex flex-col items-center">
                                                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-[4px] object-cover" />
                                                <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{member.name}</span>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={handleAddMemberClick}
                                            className="w-10 h-10 border border-dashed border-gray-300 rounded-[4px] flex items-center justify-center hover:bg-gray-50 text-gray-400"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Settings Options */}
                            <div className="py-2">
                                {activeContact.isGroup && (
                                    <>
                                        <div className="px-4 py-2 text-sm text-gray-700 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => onToggleGroupAi && onToggleGroupAi(activeContact.id)}>
                                            <span>AI 助手</span>
                                            <div className={`w-9 h-5 rounded-full relative transition-colors ${activeContact.hasAiActive ? 'bg-[#07c160]' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform transform ${activeContact.hasAiActive ? 'left-[18px]' : 'left-0.5'}`}></div>
                                            </div>
                                        </div>
                                        <div 
                                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                            onClick={() => groupAvatarInputRef.current?.click()}
                                        >
                                            <span>修改群头像</span>
                                            <ImageIcon size={14} className="text-gray-400"/>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={groupAvatarInputRef} 
                                            className="hidden"
                                            accept="image/*" 
                                            onChange={handleGroupAvatarChange}
                                        />
                                    </>
                                )}
                                <div 
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    onClick={handleSearchClick}
                                >
                                    <span>查找聊天记录</span>
                                </div>
                                <div 
                                    className="px-4 py-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer border-t border-gray-100 mt-1"
                                    onClick={handleDeleteChatClick}
                                >
                                    <span>{activeContact.isGroup ? '删除并退出' : '删除聊天'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>

      {/* Main Content Area */}
      {isSearching ? (
          /* Search Results View */
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f5f5f5] p-0">
              {searchTerm && filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-20">
                      未找到相关聊天记录
                  </div>
              ) : !searchTerm ? (
                  <div className="text-center text-gray-400 text-xs mt-10">
                      输入关键词搜索
                  </div>
              ) : (
                  <div>
                      <div className="px-4 py-2 text-xs text-gray-400 bg-[#f0f0f0]">
                          {filteredMessages.length} 条相关记录
                      </div>
                      {filteredMessages.map(msg => (
                          <div key={msg.id} className="px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                              <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                      <img 
                                        src={msg.senderId === 'me' ? currentUserAvatar : (msg.senderId !== activeContact.id && activeContact.isGroup ? `https://picsum.photos/seed/${msg.senderId}/200` : activeContact.avatar)} 
                                        alt="avatar" 
                                        className="w-5 h-5 rounded-full" 
                                      />
                                      <span className="text-xs text-gray-500">
                                          {msg.senderId === 'me' ? '我' : (msg.senderName || activeContact.name)}
                                      </span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                      {new Date(msg.timestamp).toLocaleDateString()}
                                  </span>
                              </div>
                              <div className="text-sm text-gray-800 pl-7 line-clamp-2">
                                  {msg.type === MessageType.TEXT && getHighlightedText(msg.content, searchTerm)}
                                  {msg.type === MessageType.AUDIO && getHighlightedText(msg.transcription || "[语音转文字]", searchTerm)}
                                  {msg.type === MessageType.FILE && (
                                      <div className="flex items-center gap-1">
                                          <FileText size={14} className="text-orange-500"/>
                                          {getHighlightedText(msg.fileName || "", searchTerm)}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : (
        /* Standard Chat View */
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#f5f5f5]">
            {messages.length === 0 && (
            <div className="flex justify-center mt-10">
                <span className="bg-[#dadada] text-white text-xs py-1 px-2 rounded-[4px]">
                现在可以开始聊天了
                </span>
            </div>
            )}
            
            {messages.map((msg) => {
            const isMe = msg.senderId === 'me';
            const isSystem = msg.type === MessageType.SYSTEM;
            const isAudio = msg.type === MessageType.AUDIO;
            const isImage = msg.type === MessageType.IMAGE;
            const isFile = msg.type === MessageType.FILE;
            const isPlaying = playingAudioId === msg.id;

            if (isSystem) {
                return (
                    <div key={msg.id} className="flex justify-center mb-4 animate-fade-in-up">
                        <span className="bg-[#dadada] text-white text-xs py-1 px-2 rounded-[4px]">
                            {msg.content}
                        </span>
                    </div>
                );
            }

            return (
                <div key={msg.id} className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                {!isMe && (
                    <img 
                    src={msg.senderId !== activeContact.id && activeContact.isGroup ? `https://picsum.photos/seed/${msg.senderId}/200` : activeContact.avatar} 
                    alt="Sender" 
                    className="w-9 h-9 rounded-md mr-2.5 self-start select-none object-cover"
                    />
                )}
                
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Group Chat Sender Name */}
                    {activeContact.isGroup && !isMe && (
                    <span className="text-[10px] text-gray-400 mb-1 ml-1">
                        {msg.senderName || activeContact.name}
                    </span>
                    )}

                    <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Status Indicator for Me */}
                        {isMe && (
                        <div className="flex flex-col justify-end pb-1 min-w-[30px] items-end text-right">
                            {msg.status === 'sending' && <Loader2 size={14} className="animate-spin text-gray-400" />}
                            {msg.status === 'sent' && <span className="text-[10px] text-gray-400 font-light select-none">已发送</span>}
                            {msg.status === 'read' && (
                                <span className="text-[10px] text-gray-400 font-light select-none">
                                    {activeContact.isGroup ? '1人已读' : '已读'}
                                </span>
                            )}
                        </div>
                        )}

                        <div className="flex flex-col">
                            <div className={`relative group`}>
                            {/* Bubble */}
                            <div 
                                onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                onClick={() => isAudio && playAudio(msg.content, msg.id)}
                                className={`rounded-[4px] text-[14px] leading-relaxed break-words shadow-sm cursor-default overflow-hidden ${
                                    isAudio 
                                        ? (isMe ? 'bg-[#95ec69] border border-[#8ad961]' : 'bg-white border border-[#ededed]') + ' px-2.5 py-2 flex items-center gap-2 cursor-pointer min-w-[80px]'
                                    : isImage 
                                        ? 'bg-transparent border-0 shadow-none'
                                    : isFile
                                        ? 'bg-white border border-[#ededed] p-3 flex items-center gap-3 min-w-[200px]'
                                    : (isMe ? 'bg-[#95ec69] text-black border border-[#8ad961] px-2.5 py-2' : 'bg-white text-black border border-[#ededed] px-2.5 py-2')
                                }`}
                            >
                                {isAudio && (
                                <>
                                    {!isMe && <Wifi size={16} className={`transform rotate-90 ${isPlaying ? 'text-gray-800' : 'text-gray-500'}`} />}
                                    <span className="text-xs font-medium select-none">{msg.audioDuration || 0}"</span>
                                    {isMe && <Wifi size={16} className={`transform -rotate-90 ${isPlaying ? 'text-black' : 'text-gray-600'}`} />}
                                </>
                                )}

                                {isImage && (
                                    <img src={msg.content} alt="Shared Image" className="max-w-full max-h-[300px] rounded-md border border-gray-200" />
                                )}

                                {isFile && (
                                    <>
                                        <div className="bg-orange-100 p-2 rounded">
                                            <FileText size={24} className="text-orange-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm text-black font-medium truncate max-w-[180px]">{msg.fileName || "未知文件"}</span>
                                            <span className="text-xs text-gray-400">{msg.fileSize || "未知大小"}</span>
                                        </div>
                                    </>
                                )}

                                {!isAudio && !isImage && !isFile && (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
                            </div>
                            </div>

                            {/* Transcription for Audio */}
                            {isAudio && msg.transcription && (
                                <div className="mt-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200 max-w-full self-start animate-fade-in-up">
                                    <span className="font-medium text-[10px] text-gray-400 block mb-0.5">转文字:</span>
                                    {msg.transcription}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isMe && (
                    <img 
                    src={currentUserAvatar} 
                    alt="Me" 
                    className="w-9 h-9 rounded-md ml-2.5 self-start select-none"
                    />
                )}
                </div>
            );
            })}

            {isTyping && (
            <div className="flex mb-4 justify-start animate-fade-in-up">
                <img 
                    src={activeContact.avatar} 
                    alt="Sender" 
                    className="w-9 h-9 rounded-md mr-2.5 self-start"
                />
                <div className="bg-white border border-[#ededed] px-4 py-3 rounded-[4px]">
                    <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white shadow-xl border border-[#e5e5e5] rounded py-1 w-32 animate-fade-in-up"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} 
        >
          <button 
            onClick={handleConfirmDelete}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f5f5f5] flex items-center gap-2"
          >
            <Trash2 size={14} className="text-gray-500"/>
            <span>删除</span>
          </button>
        </div>
      )}

      {/* Input Area - Only show when not searching */}
      {!isSearching && (
        <div className="h-[160px] border-t border-[#e7e7e7] bg-[#f5f5f5] flex flex-col flex-shrink-0 z-10 relative">
            
            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div id="emoji-container" className="absolute bottom-[165px] left-4 bg-white border border-gray-200 shadow-lg rounded-lg p-4 w-80 h-64 overflow-y-auto custom-scrollbar z-50 animate-fade-in-up">
                    <div className="grid grid-cols-8 gap-2">
                        {EMOJIS.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => addEmoji(emoji)}
                                className="text-xl hover:bg-gray-100 p-1 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Sticker Picker Popup */}
            {showStickerPicker && (
                <div id="sticker-container" className="absolute bottom-[165px] left-14 bg-white border border-gray-200 shadow-lg rounded-lg p-4 w-80 h-64 overflow-y-auto custom-scrollbar z-50 animate-fade-in-up">
                    {stickers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                            <Heart size={24} className="mb-2" />
                            <p>暂无收藏表情</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {stickers.map(sticker => (
                                <button 
                                    key={sticker.id} 
                                    onClick={() => handleSendSticker(sticker.url)}
                                    className="hover:bg-gray-100 p-2 rounded transition-colors aspect-square flex items-center justify-center"
                                >
                                    <img src={sticker.url} alt="sticker" className="max-w-full max-h-full object-contain" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Toolbar */}
            <div className="h-10 flex items-center px-4 gap-4 text-[#5a5a5a]">
            <button 
                className={`hover:text-black transition-colors ${inputMode === 'voice' ? 'text-green-600' : ''}`}
                onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
                title="语音模式"
            >
                <Mic size={20} strokeWidth={1.5} />
            </button>

            <button 
                id="emoji-btn"
                onClick={toggleEmojiPicker}
                className={`hover:text-black transition-colors ${showEmojiPicker ? 'text-green-600' : ''}`}
                title="表情"
            >
                <Smile size={20} strokeWidth={1.5} />
            </button>

            <button 
                id="sticker-btn"
                onClick={toggleStickerPicker}
                className={`hover:text-black transition-colors ${showStickerPicker ? 'text-green-600' : ''}`}
                title="自定义表情"
            >
                <Heart size={20} strokeWidth={1.5} />
            </button>
            
            {/* File Input Hidden */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
            />
            
            <button onClick={handleFileUploadClick} className="hover:text-black transition-colors" title="发送文件">
                <FolderOpen size={20} strokeWidth={1.5} />
            </button>
            <button onClick={handleFileUploadClick} className="hover:text-black transition-colors" title="发送图片">
                <Paperclip size={20} strokeWidth={1.5} />
            </button>
            </div>
            
            {/* Input Section */}
            <div className="flex-1 px-4 pb-2 relative">
            {inputMode === 'text' ? (
                <textarea 
                className="w-full h-full bg-transparent resize-none focus:outline-none text-[14px] leading-relaxed custom-scrollbar"
                placeholder=""
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-64 py-3 rounded-md font-medium select-none transition-all duration-150 ${
                    isRecording 
                        ? 'bg-[#d4d4d4] text-gray-700 shadow-inner scale-95' 
                        : 'bg-[#ffffff] text-black border border-[#e5e5e5] shadow-sm hover:bg-[#fbfbfb]'
                    }`}
                >
                    {isRecording ? "松开 发送" : "按住 说话"}
                </button>
                </div>
            )}
            </div>

            {/* Footer / Send Button */}
            <div className="h-12 flex justify-end items-center px-4 pb-2">
            <div className="text-xs text-gray-400 mr-4 hidden sm:block">
                {inputMode === 'text' && "松开 Enter 发送"}
            </div>
            {inputMode === 'text' && (
                <button 
                onClick={handleSendText}
                disabled={!inputValue.trim() || isTyping}
                className={`px-6 py-1.5 text-[14px] rounded-[4px] transition-colors ${
                    inputValue.trim() 
                    ? 'bg-[#e9e9e9] text-[#07c160] hover:bg-[#d2d2d2]' 
                    : 'bg-[#e9e9e9] text-[#b0b0b0] cursor-default'
                }`}
                >
                发送
                </button>
            )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;