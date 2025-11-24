import React, { useEffect, useRef, useState } from 'react';
import { Message, Role } from '../types';
import { Sparkles, Copy, ThumbsUp, ThumbsDown, RefreshCw, X, ZoomIn, Edit2, Trash2, Check } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  activeAssistantName?: string;
  onDeleteMessage?: (id: string) => void;
  onEditMessage?: (id: string, newText: string) => void;
  onRegenerateMessage?: (id: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, 
    isLoading, 
    activeAssistantName,
    onDeleteMessage,
    onEditMessage,
    onRegenerateMessage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Image Preview State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading, editingMessageId]);

  useEffect(() => {
    if (editingMessageId && textareaRef.current) {
       textareaRef.current.style.height = 'auto';
       textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
       textareaRef.current.focus();
    }
  }, [editingMessageId]);

  // Reset zoom and pan when opening a new image
  useEffect(() => {
    if (previewImage) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [previewImage]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) setPreviewImage(null);
        if (editingMessageId) setEditingMessageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, editingMessageId]);

  // Handle Ctrl + Wheel to zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!previewImage) return;

      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.002;
        setZoom(prev => Math.min(Math.max(0.1, prev + delta), 10));
      }
    };

    const modalEl = modalRef.current;
    if (modalEl) {
      modalEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (modalEl) {
        modalEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, [previewImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const startEditing = (msg: Message) => {
    const textPart = msg.parts.find(p => p.text);
    if (textPart) {
        setEditingMessageId(msg.id);
        setEditValue(textPart.text || '');
    }
  };

  const saveEdit = (id: string) => {
    if (onEditMessage && editValue.trim()) {
        onEditMessage(id, editValue.trim());
        setEditingMessageId(null);
    }
  };

  const handleCopy = (text: string) => {
     navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent font-sans" ref={scrollRef}>
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 -mt-16 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-zinc-900/50 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 shadow-2xl border border-zinc-800/50 ring-1 ring-zinc-800/50">
              <Sparkles size={28} strokeWidth={1.5} className="text-zinc-200" />
            </div>
            <h2 className="text-2xl font-medium text-zinc-100 mb-3 tracking-tight">
              {activeAssistantName || "你好"}
            </h2>
            <p className="text-zinc-500 max-w-sm text-[15px] leading-relaxed font-light">
              有什么可以帮你的吗？
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-12 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2.5">
                 {msg.role === Role.USER ? (
                   <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                     你
                   </div>
                 ) : (
                   <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10">
                     <Sparkles size={12} className="text-white" />
                   </div>
                 )}
                 <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase opacity-70">
                   {msg.role === Role.USER ? '用户' : 'Gemini'}
                 </span>
              </div>

              {/* Content */}
              <div className={`pl-9 space-y-4`}>
                 <div className="flex flex-col gap-3">
                  {msg.parts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {/* Text Content */}
                      {part.text && (
                        editingMessageId === msg.id ? (
                            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                                <textarea
                                    ref={textareaRef}
                                    value={editValue}
                                    onChange={(e) => {
                                        setEditValue(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                    className="w-full bg-transparent text-zinc-200 text-[15px] leading-7 resize-none focus:outline-none scrollbar-hide"
                                    rows={1}
                                />
                                <div className="flex justify-end gap-2 mt-3">
                                    <button 
                                        onClick={() => setEditingMessageId(null)}
                                        className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button 
                                        onClick={() => saveEdit(msg.id)}
                                        className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-md transition-colors flex items-center gap-1.5"
                                    >
                                        <Check size={12} />
                                        发送
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-zinc-300 leading-7 text-[15px] whitespace-pre-wrap font-light tracking-wide antialiased selection:bg-emerald-500/30 selection:text-emerald-100">
                                {part.text}
                            </div>
                        )
                      )}
                      
                      {/* Image Content */}
                      {part.inlineData && (
                        <div className="flex flex-col gap-2">
                            <div 
                            className="group/img relative rounded-xl overflow-hidden border border-zinc-800/50 shadow-2xl inline-block max-w-sm bg-zinc-950 cursor-zoom-in"
                            onClick={() => part.inlineData && setPreviewImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`)}
                            >
                                <img 
                                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                                    alt="Generated content" 
                                    className="w-full h-auto max-h-[350px] object-cover opacity-90 transition-all duration-500 group-hover/img:scale-105 group-hover/img:opacity-100"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                                    <ZoomIn className="text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md transition-opacity duration-300 transform scale-90 group-hover/img:scale-100" size={24} />
                                </div>
                            </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Footer Actions (User) */}
                {msg.role === Role.USER && !editingMessageId && (
                    <div className="flex items-center justify-end">
                       <div className="flex items-center gap-1 bg-zinc-900/50 backdrop-blur rounded-lg border border-zinc-800/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            onClick={() => onRegenerateMessage && onRegenerateMessage(msg.id)}
                            className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="重新生成"
                          >
                             <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => startEditing(msg)}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="编辑"
                          >
                             <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => {
                                const text = msg.parts.map(p => p.text).join('');
                                handleCopy(text);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all"
                            title="复制"
                          >
                             <Copy size={14} />
                          </button>
                          <div className="w-[1px] h-3 bg-zinc-800 mx-0.5"></div>
                          <button 
                            onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="删除"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                )}

                {/* Footer Actions (Model) */}
                {msg.role === Role.MODEL && (
                  <div className="flex items-center gap-3 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => {
                            const text = msg.parts.map(p => p.text).join('');
                            handleCopy(text);
                        }}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" 
                        title="复制"
                    >
                        <Copy size={13} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={() => onRegenerateMessage && onRegenerateMessage(msg.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" 
                        title="重新生成"
                    >
                        <RefreshCw size={13} strokeWidth={2} />
                    </button>
                    <div className="h-3 w-[1px] bg-zinc-800"></div>
                    <button className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"><ThumbsUp size={13} strokeWidth={2} /></button>
                    <button className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"><ThumbsDown size={13} strokeWidth={2} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="pl-9 animate-in fade-in duration-300">
               <div className="flex items-center gap-1.5 h-6">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <div 
          ref={modalRef}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 select-none font-sans"
          onClick={() => setPreviewImage(null)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 z-[120] p-3 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-all border border-zinc-700/50 cursor-pointer shadow-lg backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
          >
            <X size={24} />
          </button>
          
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             <img 
                src={previewImage} 
                alt="Full preview" 
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                className="max-w-full max-h-full object-contain shadow-2xl"
                onMouseDown={handleMouseDown}
                draggable={false}
             />
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none">
             <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 px-5 py-2.5 rounded-full text-xs text-zinc-300 flex items-center gap-3 shadow-xl tracking-wide">
                <span>Ctrl + 滚轮缩放</span>
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <span className="text-emerald-400">拖拽移动</span>
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <span>Esc 关闭</span>
             </div>
          </div>
        </div>
      )}
    </>
  );
};