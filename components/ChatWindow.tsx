import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Smile, Paperclip, FolderOpen, Trash2, Mic, Wifi, Loader2 } from 'lucide-react';
import { Contact, Message, MessageType } from '../types';

interface ChatWindowProps {
  activeContact: Contact;
  messages: Message[];
  currentUserAvatar: string;
  onSendMessage: (content: string, type: MessageType, duration?: number) => void;
  onDeleteMessage: (messageId: string) => void;
  isTyping: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  activeContact, 
  messages, 
  currentUserAvatar, 
  onSendMessage,
  onDeleteMessage,
  isTyping
}) => {
  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeContact.id]);

  // Close context menu on clicking anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
    }
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
          onSendMessage(base64data, MessageType.AUDIO, duration);
        };
        
        // Stop all tracks
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

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] w-full relative">
      {/* Header */}
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5] flex-shrink-0 z-10">
        <div className="font-medium text-[16px] text-black select-none flex items-center gap-2">
          {activeContact.name}
          {activeContact.isGroup && <span className="text-xs text-gray-400">(群聊)</span>}
        </div>
        <button className="text-gray-600 hover:text-black">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Message Area */}
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
          const isAudio = msg.type === MessageType.AUDIO;
          const isPlaying = playingAudioId === msg.id;

          return (
            <div key={msg.id} className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
              {!isMe && (
                <img 
                  src={msg.senderId !== activeContact.id && activeContact.isGroup ? `https://picsum.photos/seed/${msg.senderId}/200` : activeContact.avatar} 
                  alt="Sender" 
                  className="w-9 h-9 rounded-md mr-2.5 self-start select-none"
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
                    <div className="flex flex-col justify-end pb-1 min-w-[30px] items-end">
                        {msg.status === 'sending' && <Loader2 size={14} className="animate-spin text-gray-400" />}
                        {msg.status === 'sent' && <span className="text-[10px] text-gray-400 font-light select-none">已发送</span>}
                        {msg.status === 'read' && <span className="text-[10px] text-gray-400 font-light select-none">已读</span>}
                    </div>
                    )}

                    <div className="flex flex-col">
                        <div className={`relative group`}>
                        {/* Bubble */}
                        <div 
                            onContextMenu={(e) => handleContextMenu(e, msg.id)}
                            onClick={() => isAudio && playAudio(msg.content, msg.id)}
                            className={`px-2.5 py-2 rounded-[4px] text-[14px] leading-relaxed break-words shadow-sm cursor-default ${
                            isMe 
                                ? 'bg-[#95ec69] text-black border border-[#8ad961]' 
                                : 'bg-white text-black border border-[#ededed]'
                            } ${isAudio ? 'flex items-center gap-2 cursor-pointer min-w-[80px]' : ''}`}
                        >
                            {isAudio ? (
                            <>
                                {/* Audio Wave Icon Placeholder */}
                                {!isMe && <Wifi size={16} className={`transform rotate-90 ${isPlaying ? 'text-gray-800' : 'text-gray-500'}`} />}
                                <span className="text-xs font-medium select-none">{msg.audioDuration || 0}"</span>
                                {isMe && <Wifi size={16} className={`transform -rotate-90 ${isPlaying ? 'text-black' : 'text-gray-600'}`} />}
                            </>
                            ) : (
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
                         {isAudio && !msg.transcription && isMe && msg.status !== 'sending' && (
                             <div className="mt-1 text-[10px] text-gray-300 italic px-1">
                                 正在转文字...
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

      {/* Input Area */}
      <div className="h-[160px] border-t border-[#e7e7e7] bg-[#f5f5f5] flex flex-col flex-shrink-0 z-10">
        {/* Toolbar */}
        <div className="h-10 flex items-center px-4 gap-4 text-[#5a5a5a]">
          {/* Mic Toggle */}
          <button 
            className={`hover:text-black transition-colors ${inputMode === 'voice' ? 'text-green-600' : ''}`}
            onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
            title="语音模式"
          >
            <Mic size={20} strokeWidth={1.5} />
          </button>

          <button className="hover:text-black transition-colors"><Smile size={20} strokeWidth={1.5} /></button>
          <button className="hover:text-black transition-colors"><FolderOpen size={20} strokeWidth={1.5} /></button>
          <button className="hover:text-black transition-colors"><Paperclip size={20} strokeWidth={1.5} /></button>
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
            {inputMode === 'text' && "按下 Enter 发送内容"}
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
    </div>
  );
};

export default ChatWindow;