
import React, { useState, useRef } from 'react';
import { Plus, X, Trash2, GripHorizontal, Smile } from 'lucide-react';
import { Sticker } from '../types';

interface StickerManagerProps {
  stickers: Sticker[];
  onAddSticker: (base64: string) => void;
  onDeleteSticker: (id: string) => void;
  onReorderStickers: (startIndex: number, endIndex: number) => void;
}

const StickerManager: React.FC<StickerManagerProps> = ({ 
  stickers, 
  onAddSticker, 
  onDeleteSticker,
  onReorderStickers
}) => {
  const [isManaging, setIsManaging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onAddSticker(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Optional: visual feedback logic could go here
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderStickers(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="h-16 border-b border-[#e7e7e7] flex justify-between items-center px-6 bg-[#f5f5f5] flex-shrink-0">
        <div className="font-medium text-[16px] text-black select-none flex items-center gap-2">
          <Smile size={20} />
          <span>自定义表情</span>
        </div>
        <button 
          onClick={() => setIsManaging(!isManaging)}
          className={`text-[14px] px-4 py-1 rounded ${isManaging ? 'text-[#07c160] bg-[#ededed]' : 'text-black hover:bg-[#e5e5e5]'} transition-colors`}
        >
          {isManaging ? '完成' : '整理'}
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
          
          {/* Add Button */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors hover:border-gray-400"
          >
            <Plus size={32} className="text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">添加</span>
          </div>

          {/* Sticker List */}
          {stickers.map((sticker, index) => (
            <div 
              key={sticker.id}
              draggable={isManaging}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              className={`relative aspect-square group bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-transparent ${
                isManaging ? 'cursor-move hover:shadow-md' : 'cursor-pointer'
              } ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}`}
            >
              <img 
                src={sticker.url} 
                alt="sticker" 
                className="max-w-[85%] max-h-[85%] object-contain pointer-events-none select-none"
              />
              
              {/* Delete Overlay in Manage Mode */}
              {isManaging && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSticker(sticker.id);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-10"
                >
                  <X size={12} />
                </button>
              )}

              {/* Drag Handle Visual Hint */}
              {isManaging && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-gray-400 opacity-50">
                      <GripHorizontal size={16} />
                  </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs">
          {isManaging ? "拖拽表情可调整顺序" : `共 ${stickers.length} 个表情`}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};

export default StickerManager;
