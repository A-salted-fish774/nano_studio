import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  PanelLeft,
  Bot,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId,
  onNewChat, 
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onOpenSettings,
  onToggleSidebar
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
    setDeleteConfirmId(null);
  };

  const saveTitle = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      onDeleteSession(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col border-r border-zinc-900 bg-zinc-950 font-sans">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 text-zinc-100 font-medium tracking-tight">
           <div className="w-7 h-7 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center">
             <Bot size={16} strokeWidth={1.5} className="text-emerald-500" />
           </div>
           <span className="text-[15px]">工作室</span>
        </div>
        <button 
          onClick={onToggleSidebar}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 hover:bg-zinc-900 rounded-md"
        >
           <PanelLeft size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Primary Action */}
      <div className="px-3 mb-6 flex-shrink-0">
        <button 
          onClick={onNewChat}
          className="group w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 transition-all py-2.5 px-3 rounded-lg border border-zinc-800/50 hover:border-zinc-800 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} strokeWidth={1.5} className="text-zinc-500 group-hover:text-zinc-300" />
            <span className="text-sm font-medium">新对话</span>
          </div>
          <span className="text-xs text-zinc-600 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800/50 group-hover:border-zinc-700">⌘K</span>
        </button>
      </div>

      {/* Section Label */}
      <div className="px-5 pb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest opacity-80 flex-shrink-0">
        对话列表
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-900">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-all border border-transparent cursor-pointer ${
              session.id === activeSessionId
                ? 'bg-zinc-900 text-zinc-200 border-zinc-800/50 shadow-sm' 
                : 'text-zinc-500 hover:bg-zinc-900/30 hover:text-zinc-300'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare size={14} className={`flex-shrink-0 ${session.id === activeSessionId ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-zinc-500'}`} />
            
            {editingId === session.id ? (
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle(session.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={() => saveTitle(session.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-950 text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-700 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            ) : (
              <span className="truncate flex-1">{session.title}</span>
            )}

            {/* Hover Actions */}
            {editingId !== session.id && (
              <div className={`flex items-center gap-1 ${session.id === activeSessionId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                
                {deleteConfirmId === session.id ? (
                   <span className="text-[10px] text-red-400 font-medium animate-in fade-in mr-1">确定?</span>
                ) : null}

                <button 
                  onClick={(e) => startEditing(e, session)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="重命名"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  className={`p-1 hover:bg-zinc-800 rounded transition-colors ${deleteConfirmId === session.id ? 'text-red-400 bg-zinc-800' : 'text-zinc-500 hover:text-red-400'}`}
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        
        {sessions.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-zinc-600 italic">
                暂无对话
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-900 flex-shrink-0">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm w-full px-3 py-2 rounded-lg hover:bg-zinc-900/50"
        >
           <Settings size={16} strokeWidth={1.5} />
           <span>设置</span>
        </button>
      </div>
    </div>
  );
};