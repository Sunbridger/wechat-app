import React, { useState, useRef, useEffect } from 'react';
import { Camera, Heart, MessageSquare, MoreHorizontal, X, Image as ImageIcon, Send, Plus, Video } from 'lucide-react';
import { Moment, User } from '../types';

interface MomentsProps {
  currentUser: User;
  moments: Moment[];
  onAddMoment: (content: string, images: string[], video?: string) => void;
  onAddComment: (momentId: string, content: string) => void;
  onLikeMoment: (momentId: string) => void;
}

const Moments: React.FC<MomentsProps> = ({ currentUser, moments, onAddMoment, onAddComment, onLikeMoment }) => {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [commentingMomentId, setCommentingMomentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Publish Modal State
  const [isPublishing, setIsPublishing] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostVideo, setNewPostVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (activeActionId && !(e.target as HTMLElement).closest('.action-btn')) {
            setActiveActionId(null);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeActionId]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleActionClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveActionId(activeActionId === id ? null : id);
  };

  const handleLikeClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onLikeMoment(id);
      setActiveActionId(null);
  };

  const handleCommentClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveActionId(null);
      setCommentingMomentId(id);
      setCommentText('');
  };

  const submitComment = () => {
      if (commentingMomentId && commentText.trim()) {
          onAddComment(commentingMomentId, commentText.trim());
          setCommentingMomentId(null);
          setCommentText('');
      }
  };

  // Publishing Logic
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const result = ev.target.result as string;
                  if (file.type.startsWith('video/')) {
                      setNewPostVideo(result);
                      setNewPostImages([]); // Clear images if video is selected
                  } else {
                      setNewPostImages(prev => [...prev, result]);
                      setNewPostVideo(null); // Clear video if image is selected
                  }
              }
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = () => {
      if (!newPostContent.trim() && newPostImages.length === 0 && !newPostVideo) return;
      onAddMoment(newPostContent, newPostImages, newPostVideo || undefined);
      setIsPublishing(false);
      setNewPostContent('');
      setNewPostImages([]);
      setNewPostVideo(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Header Bar for Moments */}
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5] flex-shrink-0 z-20">
        <div className="font-medium text-[16px] text-black select-none">
          朋友圈
        </div>
        <button 
            onClick={() => setIsPublishing(true)}
            className="text-black hover:bg-gray-200 p-1.5 rounded-full transition-colors"
        >
            <Camera size={22} />
        </button>
      </div>

      {/* Scrollable Feed Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        
        {/* Cover Image Area */}
        <div className="relative mb-16">
            {/* Random nature cover */}
            <img 
                src="https://picsum.photos/id/16/1000/600" 
                alt="Cover" 
                className="w-full h-80 object-cover"
            />
            {/* User Info Overlay */}
            <div className="absolute -bottom-10 right-4 flex items-end gap-4">
                <span className="text-white font-bold text-lg mb-5 drop-shadow-md shadow-black">{currentUser.name}</span>
                <img 
                    src={currentUser.avatar} 
                    alt="Me" 
                    className="w-20 h-20 rounded-[4px] border-[3px] border-white bg-white object-cover"
                />
            </div>
        </div>

        {/* Moments List */}
        <div className="px-6 pb-10 max-w-3xl mx-auto">
            {moments.map(moment => {
                const isLiked = moment.likes.includes(currentUser.name);
                return (
                <div key={moment.id} className="flex gap-4 mb-10 border-b border-gray-100 pb-6 last:border-0">
                    {/* Author Avatar */}
                    <img 
                        src={moment.author.avatar} 
                        alt={moment.author.name} 
                        className="w-10 h-10 rounded-[4px] bg-gray-200 object-cover flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                        {/* Author Name */}
                        <div className="text-[#576b95] font-semibold text-[15px] mb-1 leading-tight">
                            {moment.author.name}
                        </div>
                        
                        {/* Content Text */}
                        <div className="text-[15px] text-[#191919] mb-2.5 whitespace-pre-wrap leading-relaxed">
                            {moment.content}
                        </div>

                        {/* Video Player */}
                        {moment.video && (
                             <div className="mb-3 max-w-[300px]">
                                <video 
                                    src={moment.video} 
                                    controls 
                                    className="w-full max-h-[400px] bg-black rounded-md"
                                />
                            </div>
                        )}

                        {/* Image Grid */}
                        {moment.images.length > 0 && (
                            <div className={`grid gap-1.5 mb-3 ${moment.images.length === 1 ? 'grid-cols-1 max-w-[200px]' : moment.images.length === 4 ? 'grid-cols-2 max-w-[200px]' : 'grid-cols-3 max-w-[300px]'}`}>
                                {moment.images.map((img, idx) => (
                                    <img 
                                        key={idx} 
                                        src={img} 
                                        alt="Moment" 
                                        className={`object-cover bg-gray-100 ${moment.images.length === 1 ? 'aspect-auto max-h-[200px]' : 'aspect-square w-full h-full'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Meta & Actions */}
                        <div className="flex justify-between items-center mt-2 relative h-6">
                            <span className="text-xs text-gray-400">{formatTime(moment.timestamp)}</span>
                            
                            {/* Action Popover Trigger */}
                            <div className="relative">
                                {/* The Menu Bubble */}
                                <div className={`absolute right-8 top-1/2 -translate-y-1/2 bg-[#4c4c4c] rounded-[4px] flex items-center overflow-hidden transition-all duration-200 ease-in-out ${activeActionId === moment.id ? 'w-[180px] opacity-100' : 'w-0 opacity-0'}`}>
                                    <button 
                                        onClick={(e) => handleLikeClick(e, moment.id)}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 text-white hover:bg-[#3b3b3b] text-[13px]"
                                    >
                                        <Heart size={14} fill={isLiked ? "white" : "none"} />
                                        <span>{isLiked ? "取消" : "赞"}</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-[#3b3b3b]"></div>
                                    <button 
                                        onClick={(e) => handleCommentClick(e, moment.id)}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 text-white hover:bg-[#3b3b3b] text-[13px]"
                                    >
                                        <MessageSquare size={14} />
                                        <span>评论</span>
                                    </button>
                                </div>

                                {/* The Button */}
                                <button 
                                    onClick={(e) => handleActionClick(e, moment.id)}
                                    className="action-btn bg-[#f7f7f7] text-[#576b95] px-2 py-1 rounded-[4px] hover:bg-[#ededed]"
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Interactions Box */}
                        {(moment.likes.length > 0 || moment.comments.length > 0) && (
                            <div className="bg-[#f7f7f7] mt-3 rounded-[4px] p-2 relative">
                                {/* Little arrow up */}
                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#f7f7f7] transform rotate-45"></div>

                                {/* Likes */}
                                {moment.likes.length > 0 && (
                                    <div className="flex items-start gap-2 text-[13px] text-[#576b95] border-b border-[#ededed] pb-1.5 mb-1.5 last:border-0 last:mb-0 last:pb-0">
                                        <Heart size={14} className="mt-1 text-[#576b95]" />
                                        <span className="font-medium leading-tight">
                                            {moment.likes.join(', ')}
                                        </span>
                                    </div>
                                )}

                                {/* Comments */}
                                {moment.comments.map(comment => (
                                    <div key={comment.id} className="text-[13px] leading-relaxed">
                                        <span className="text-[#576b95] font-medium">{comment.authorName}</span>
                                        <span className="text-[#191919]">：{comment.content}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Inline Comment Input */}
                        {commentingMomentId === moment.id && (
                             <div className="mt-3 flex gap-2 animate-fade-in-up">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-[#f5f5f5] border border-[#e5e5e5] rounded-[4px] px-3 py-1.5 text-sm focus:outline-none focus:border-[#07c160]"
                                    placeholder="评论"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                                    autoFocus
                                />
                                <button 
                                    onClick={submitComment}
                                    disabled={!commentText.trim()}
                                    className={`px-3 py-1.5 rounded-[4px] text-xs text-white transition-colors ${commentText.trim() ? 'bg-[#07c160] hover:bg-[#06ad56]' : 'bg-gray-300'}`}
                                >
                                    发送
                                </button>
                             </div>
                        )}
                    </div>
                </div>
            )})}
        </div>
      </div>

      {/* Publish Modal */}
      {isPublishing && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col animate-fade-in-up">
              <div className="h-14 border-b border-[#e7e7e7] flex justify-between items-center px-4 bg-[#f5f5f5]">
                  <button onClick={() => setIsPublishing(false)} className="text-black text-[15px]">取消</button>
                  <button 
                    onClick={handlePublish}
                    disabled={!newPostContent.trim() && newPostImages.length === 0 && !newPostVideo}
                    className={`px-4 py-1.5 rounded-[4px] text-[14px] text-white ${(!newPostContent.trim() && newPostImages.length === 0 && !newPostVideo) ? 'bg-gray-300' : 'bg-[#07c160]'}`}
                  >
                      发表
                  </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                  <textarea 
                    className="w-full h-32 resize-none text-[16px] focus:outline-none placeholder-gray-400"
                    placeholder="这一刻的想法..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                      {/* Display Images */}
                      {newPostImages.map((img, idx) => (
                          <div key={idx} className="aspect-square relative group">
                              <img src={img} alt="Upload" className="w-full h-full object-cover rounded-sm" />
                              <button 
                                onClick={() => setNewPostImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  <X size={12} />
                              </button>
                          </div>
                      ))}

                       {/* Display Video */}
                       {newPostVideo && (
                           <div className="aspect-square relative group col-span-2">
                               <video src={newPostVideo} className="w-full h-full object-cover rounded-sm bg-black" />
                               <button 
                                onClick={() => setNewPostVideo(null)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 group-hover:opacity-100 transition-opacity"
                              >
                                  <X size={12} />
                              </button>
                           </div>
                       )}

                      {/* Add Button */}
                      {(newPostImages.length < 9 && !newPostVideo) && (
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square bg-[#f7f7f7] flex items-center justify-center rounded-sm hover:bg-[#efefef] transition-colors"
                          >
                              <Plus size={30} className="text-gray-400" />
                          </button>
                      )}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">支持上传图片或视频</div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                  />
              </div>
          </div>
      )}
    </div>
  );
};

export default Moments;
