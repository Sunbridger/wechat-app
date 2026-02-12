import React, { useState } from 'react';
import { Search, UserPlus, Loader2, Info, Check, X, Clock } from 'lucide-react';
import { FriendRequest } from '../types';

interface NewFriendsProps {
  onAddContact: (name: string, peerId?: string, avatar?: string) => void;
  onBack: () => void;
  onSearchUser?: (keyword: string) => Promise<{ name: string; peerId: string; avatar: string } | null>;
  myPeerId?: string;
  myUsername?: string;
  friendRequests?: FriendRequest[];
  sentFriendRequests?: FriendRequest[];
  onAcceptFriendRequest?: (request: FriendRequest) => void;
  onRejectFriendRequest?: (request: FriendRequest) => void;
}

const NewFriends: React.FC<NewFriendsProps> = ({
  onAddContact,
  onBack,
  onSearchUser,
  myPeerId,
  myUsername,
  friendRequests = [],
  sentFriendRequests = [],
  onAcceptFriendRequest,
  onRejectFriendRequest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, peerId: string, avatar: string} | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const pendingRequests = friendRequests.filter(r => r.status === 'pending');
  const processedRequests = friendRequests.filter(r => r.status !== 'pending');

  const fallbackSearch = (keyword: string) => {
    const isLikelyPeerId = /^[a-zA-Z0-9_-]{10,}$/.test(keyword);
    setSearchResult({
      name: isLikelyPeerId ? `用户_${keyword.substring(0, 8)}` : keyword,
      peerId: keyword,
      avatar: `https://picsum.photos/seed/${keyword}/200`
    });
  };

  const handleSearch = async () => {
    const keyword = searchTerm.trim();
    if (!keyword) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    if (!onSearchUser) {
      setTimeout(() => {
        fallbackSearch(keyword);
        setIsSearching(false);
      }, 400);
      return;
    }

    try {
      const result = await onSearchUser(keyword);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('未找到该用户或对方当前不在线');
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : '搜索失败，请稍后重试'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = () => {
    if (searchResult) {
      onAddContact(searchResult.name, searchResult.peerId, searchResult.avatar);
      setSearchTerm('');
      setSearchResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSearch();
      }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f5f5f5]">
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5]">
        <button onClick={onBack} className="text-gray-600 hover:text-black p-2">
          ←
        </button>
        <span className="font-medium text-[16px] text-black">新的朋友</span>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 好友请求列表 */}
        {pendingRequests.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-[#f0f0f0] text-xs text-gray-500 font-medium">
              好友请求 ({pendingRequests.length})
            </div>
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center p-4 bg-white border-b border-gray-100 hover:bg-gray-50"
              >
                <img
                  src={request.fromUser.avatar}
                  alt={request.fromUser.name}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-black truncate">
                    {request.fromUser.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {request.message || '请求添加你为好友'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(request.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => onAcceptFriendRequest?.(request)}
                    className="flex items-center gap-1 px-4 py-1.5 bg-[#07c160] text-white text-xs rounded hover:bg-[#06ad56] transition-colors"
                  >
                    <Check size={14} />
                    接受
                  </button>
                  <button
                    onClick={() => onRejectFriendRequest?.(request)}
                    className="flex items-center gap-1 px-4 py-1.5 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300 transition-colors"
                  >
                    <X size={14} />
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 已发送的好友请求 */}
        {sentFriendRequests.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-[#f0f0f0] text-xs text-gray-500 font-medium">
              已发送的请求
            </div>
            {sentFriendRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center p-4 bg-white border-b border-gray-100"
              >
                <img
                  src={request.toUser.avatar}
                  alt={request.toUser.name}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-black truncate">
                    {request.toUser.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(request.timestamp)}
                  </p>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  request.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-600'
                    : request.status === 'accepted'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {request.status === 'pending' ? '等待验证' :
                   request.status === 'accepted' ? '已通过' : '已拒绝'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 已处理的请求 */}
        {processedRequests.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-[#f0f0f0] text-xs text-gray-500 font-medium">
              已处理
            </div>
            {processedRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center p-4 bg-white border-b border-gray-100 opacity-60"
              >
                <img
                  src={request.fromUser.avatar}
                  alt={request.fromUser.name}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-black truncate">
                    {request.fromUser.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {request.status === 'accepted' ? '已添加为好友' : '已拒绝'}
                  </p>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  request.status === 'accepted'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {request.status === 'accepted' ? '已接受' : '已拒绝'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 搜索添加区域 */}
        <div className="p-6">
          {/* 我的信息卡片 */}
          {myUsername && (
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Info size={16} />
                <span className="text-sm font-medium">我的账号信息</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">用户名：<span className="text-black font-medium">{myUsername}</span></p>
                  {myPeerId && (
                    <p className="text-xs text-gray-400 mt-1">Peer ID: {myPeerId.substring(0, 16)}...</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(myUsername);
                    alert(`用户名 "${myUsername}" 已复制！分享给好友即可搜索添加`);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#07c160] text-white rounded hover:bg-[#06ad56] transition-colors"
                >
                  复制用户名
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 将用户名分享给好友，对方搜索即可添加你为好友
              </p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="输入好友的用户名搜索"
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

          {/* 使用说明 */}
          <div className="mb-4 p-3 bg-[#fff9e6] rounded-lg border border-[#ffe58f]">
            <p className="text-xs text-[#ad8b00]">
              <strong>添加好友说明：</strong><br/>
              1. 双方都需要登录并在线<br/>
              2. 输入对方的用户名进行搜索<br/>
              3. 发送请求后等待对方确认
            </p>
          </div>

          {/* Content Area */}
          <div className="flex flex-col items-center">
              {isSearching ? (
                  <div className="flex flex-col items-center mt-6 text-gray-400">
                      <Loader2 size={32} className="animate-spin mb-2" />
                      <span className="text-sm">正在查找...</span>
                  </div>
              ) : searchResult ? (
                  <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center animate-fade-in-up">
                      <img
                          src={searchResult.avatar}
                          alt={searchResult.name}
                          className="w-14 h-14 rounded-md object-cover"
                      />
                      <div className="ml-4 flex-1">
                          <h3 className="text-base font-medium text-black">{searchResult.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                              {searchResult.peerId && searchResult.peerId !== searchResult.name
                                  ? `Peer ID: ${searchResult.peerId.substring(0, 20)}${searchResult.peerId.length > 20 ? '...' : ''}`
                                  : '用户名: ' + searchResult.name}
                          </p>
                      </div>
                      <button
                          onClick={handleAdd}
                          className="px-5 py-2 bg-[#07c160] text-white font-medium rounded hover:bg-[#06ad56] transition-colors flex items-center gap-2"
                      >
                          <UserPlus size={16} />
                          添加好友
                      </button>
                  </div>
              ) : searchError ? (
                  <div className="flex flex-col items-center mt-6 text-red-500 text-sm">
                      {searchError}
                  </div>
              ) : (
                  <div className="flex flex-col items-center mt-6 opacity-40">
                      <div className="w-14 h-14 bg-gray-300 rounded-full flex items-center justify-center mb-3">
                          <Search size={28} className="text-white" />
                      </div>
                      <p className="text-gray-500 text-sm">输入用户名搜索添加新朋友</p>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewFriends;