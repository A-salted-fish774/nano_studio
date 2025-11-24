import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { Message, Role, Attachment, Assistant, ChatSession } from './types';
import { generateContent } from './services/geminiService';
import { SettingsModal } from './components/SettingsModal';
import { 
  Menu,
  ChevronDown,
} from 'lucide-react';

const INITIAL_ASSISTANTS: Assistant[] = [
  { 
    id: 'nano-banana', 
    name: 'Nano Banana', 
    icon: '🍌', 
    model: 'gemini-2.5-flash-image',
    systemInstruction: 'You are an expert AI image generator. Your task is to generate images based on the user\'s prompt. You must NOT return JSON, code, or text descriptions of the image. You must ONLY return the generated image itself. If the user provides an image, use it as a reference for editing.'
  },
  { 
    id: 'nano-banana-pro', 
    name: 'Nano Banana Pro', 
    icon: '🍌⁺', 
    model: 'gemini-3-pro-image-preview',
    systemInstruction: 'You are a high-fidelity AI image generator. Your task is to generate high-quality, photorealistic or stylized images. You must NOT return JSON, code, or text descriptions. You must ONLY return the generated image. If the user provides an image, use it as a reference.'
  },
  { 
    id: 'gemini-3-pro', 
    name: 'Gemini 3.0 Pro', 
    icon: '🧠', 
    model: 'gemini-3-pro-preview',
    systemInstruction: 'You are a helpful and intelligent AI assistant capable of complex reasoning and text processing. Answer the user\'s questions comprehensively.'
  },
];

const App: React.FC = () => {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    return [{
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      assistantId: 'nano-banana',
      createdAt: Date.now()
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('active_session_id');
    return saved || (sessions.length > 0 ? sessions[0].id : '');
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  
  // Settings State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('gemini_base_url') || '');

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Derived State
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const activeAssistant = INITIAL_ASSISTANTS.find(a => a.id === activeSession?.assistantId) || INITIAL_ASSISTANTS[0];

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      assistantId: 'nano-banana', 
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    if (activeSessionId === id) {
      if (newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, title: newTitle } : s
    ));
  };

  const updateActiveSessionMessages = (newMessages: Message[], newTitle?: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { 
          ...s, 
          messages: newMessages,
          title: newTitle || s.title
        };
      }
      return s;
    }));
  };

  const updateActiveSessionAssistant = (assistantId: string) => {
     setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, assistantId } : s
      ));
      setShowAssistantMenu(false);
  };

  // Core generation logic that can be reused for Sending, Editing, and Regenerating
  const processMessage = async (
    text: string, 
    attachments: Attachment[], 
    history: Message[], 
    shouldAutoTitle: boolean
  ) => {
    
    // Create User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      parts: [
        ...(text ? [{ text }] : []),
        ...attachments.map(a => ({
          inlineData: { mimeType: a.mimeType, data: a.data }
        }))
      ],
      timestamp: Date.now()
    };

    const messagesWithUser = [...history, newUserMsg];
    
    let newTitle = undefined;
    if (shouldAutoTitle && history.length === 0) {
      newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    updateActiveSessionMessages(messagesWithUser, newTitle);
    setIsLoading(true);

    try {
      // We pass the raw text and let the system instruction in config guide the model
      const responseParts = await generateContent(
        text,
        attachments.map(a => ({ mimeType: a.mimeType, data: a.data })),
        activeAssistant.model,
        apiKey,
        baseUrl,
        undefined, // config
        activeAssistant.systemInstruction // Pass system instruction
      );

      const newModelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        parts: responseParts,
        timestamp: Date.now()
      };

      updateActiveSessionMessages([...messagesWithUser, newModelMsg]);

    } catch (error: any) {
      console.error("Chat Error:", error);
      
      let errorMessage = "无法生成响应。";
      let isPermissionError = false;

      // Ensure we treat the error as a string for inclusion checking, or check properties
      const errString = error.toString();
      const errStatus = error.status || error.code;
      const errDetails = error.message || '';

      // Handle 403 Forbidden specifically
      if (errString.includes('403') || errStatus === 403) {
        errorMessage = `❌ 权限不足 (403)。\n\n您当前的 API 密钥无法访问模型 "${activeAssistant.name}"。\n\n• 请尝试切换回 Nano Banana (基础版)。\n• 或者在设置中输入具有 Billing/付费权限的 API Key。`;
        isPermissionError = true;
      } 
      // Handle 429 Resource Exhausted (Quota)
      else if (errString.includes('429') || errStatus === 429 || errDetails.includes('Quota exceeded')) {
         errorMessage = `⚠️ 配额已用尽 (429)。\n\n您当前的 API 使用量已达到 Google 免费层级的限制。\n\n• 请稍等片刻再试（通常每分钟重置）。\n• 或者在设置中输入付费项目的 API Key 以获得更高配额。`;
      }
      // Handle 503 Service Unavailable / Overloaded
      else if (errString.includes('503') || errStatus === 503) {
        errorMessage = `⚠️ 服务过载 (503)。\n\nGemini 服务当前繁忙。请稍后再试。`;
      }
      else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: Role.MODEL,
        parts: [{ text: errorMessage }],
        timestamp: Date.now()
      };
      updateActiveSessionMessages([...messagesWithUser, errorMsg]);
      
      if (isPermissionError) {
        // Small delay to let the user see the message appears first
        setTimeout(() => setIsSettingsOpen(true), 1500);
      }

    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (text: string, attachments: Attachment[]) => {
    if (!activeSession) return;
    processMessage(text, attachments, activeSession.messages, activeSession.title === '新对话');
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeSession) return;
    
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    // Get attachments from the original message
    const originalMsg = activeSession.messages[index];
    const attachments = originalMsg.parts
      .filter(p => p.inlineData)
      .map(p => ({
        mimeType: p.inlineData!.mimeType,
        data: p.inlineData!.data,
        previewUrl: '' // Not used for re-submission
      }));

    // Cut history to before this message
    const historyBefore = activeSession.messages.slice(0, index);

    // Resubmit
    processMessage(newText, attachments, historyBefore, false);
  };

  const handleRegenerateMessage = (messageId: string) => {
    if (!activeSession) return;
    
    // If it's a model message, we regenerate the response to the PREVIOUS user message
    // If it's a user message, we resend that user message
    
    let targetUserMsgIndex = activeSession.messages.findIndex(m => m.id === messageId);
    if (targetUserMsgIndex === -1) return;

    const targetMsg = activeSession.messages[targetUserMsgIndex];
    
    if (targetMsg.role === Role.MODEL) {
      // Find the user message before this model message
      targetUserMsgIndex = targetUserMsgIndex - 1;
    }

    if (targetUserMsgIndex < 0) return;

    const userMsg = activeSession.messages[targetUserMsgIndex];
    const attachments = userMsg.parts
      .filter(p => p.inlineData)
      .map(p => ({
        mimeType: p.inlineData!.mimeType,
        data: p.inlineData!.data,
        previewUrl: ''
      }));
    const text = userMsg.parts.find(p => p.text)?.text || '';

    // History before the user message
    const historyBefore = activeSession.messages.slice(0, targetUserMsgIndex);

    processMessage(text, attachments, historyBefore, false);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeSession) return;
    
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    // Delete this message and if it's a user message, potentially the next model response
    let deleteCount = 1;
    if (activeSession.messages[index].role === Role.USER) {
      if (index + 1 < activeSession.messages.length && activeSession.messages[index + 1].role === Role.MODEL) {
        deleteCount = 2;
      }
    }

    const newMessages = [...activeSession.messages];
    newMessages.splice(index, deleteCount);
    
    updateActiveSessionMessages(newMessages);
  };

  const handleSaveSettings = (key: string, url: string) => {
    setApiKey(key);
    setBaseUrl(url);
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('gemini_base_url', url);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden selection:bg-emerald-500/30 font-sans">
      
      {/* Sidebar - Desktop */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative hidden md:block`}>
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={setActiveSessionId}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-zinc-950/50">
        
        {/* Header */}
        <div className="h-14 border-b border-zinc-900/80 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-sm z-10 shrink-0">
             
             {/* Left: Mobile Menu & Assistant Selector */}
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-zinc-200 md:hidden">
                  <Menu size={20} />
               </button>
               {!isSidebarOpen && (
                 <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-zinc-200 hidden md:block">
                    <Menu size={20} />
                 </button>
               )}
               
               {/* Assistant Dropdown */}
               <div className="relative">
                 <button 
                    onClick={() => setShowAssistantMenu(!showAssistantMenu)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-200 text-sm font-medium"
                 >
                    <span>{activeAssistant.icon}</span>
                    <span>{activeAssistant.name}</span>
                    <ChevronDown size={14} className="text-zinc-500" />
                 </button>

                 {showAssistantMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssistantMenu(false)}></div>
                      <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">切换模型</div>
                        {INITIAL_ASSISTANTS.map(a => (
                          <button
                            key={a.id}
                            onClick={() => updateActiveSessionAssistant(a.id)}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors ${activeSession.assistantId === a.id ? 'text-emerald-400 bg-zinc-800/50' : 'text-zinc-300'}`}
                          >
                             <span className="text-lg">{a.icon}</span>
                             <div className="flex flex-col">
                               <span className="font-medium">{a.name}</span>
                               <span className="text-[10px] text-zinc-500 font-mono">{a.model}</span>
                             </div>
                          </button>
                        ))}
                      </div>
                    </>
                 )}
               </div>
             </div>

             {/* Right: Status */}
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`}></div>
             </div>
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="absolute inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}>
             <div className="h-full w-72 bg-zinc-950 shadow-2xl border-r border-zinc-900" onClick={e => e.stopPropagation()}>
                <Sidebar 
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onNewChat={() => { handleNewChat(); setIsSidebarOpen(false); }}
                  onSelectSession={(id) => { setActiveSessionId(id); setIsSidebarOpen(false); }}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                  onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
                  onToggleSidebar={() => setIsSidebarOpen(false)}
                />
             </div>
          </div>
        )}

        <MessageList 
          messages={activeSession.messages} 
          isLoading={isLoading} 
          activeAssistantName={activeAssistant.name}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
        />

        <InputArea 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          modelName={activeAssistant.model}
        />
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialApiKey={apiKey}
        initialBaseUrl={baseUrl}
      />
    </div>
  );
};

export default App;
