import React, { useRef, useState, KeyboardEvent, useEffect } from 'react';
import { 
  Plus, 
  Image as ImageIcon, 
  ArrowUp,
  X,
  Mic,
  MicOff
} from 'lucide-react';
import { Attachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  modelName: string;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, modelName }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition if available
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; // Changed to Chinese

        recognition.onresult = (event: any) => {
           let finalTranscript = '';
           for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                 finalTranscript += event.results[i][0].transcript;
              }
           }
           if (finalTranscript) {
              setText(prev => prev + finalTranscript);
           }
        };

        recognition.onend = () => {
           setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
        console.error("Speech recognition error", e);
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    // Stop listening on send if active
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const base64 = await convertFileToBase64(file);
        newAttachments.push({
          mimeType: file.type,
          data: base64,
          previewUrl: URL.createObjectURL(file),
        });
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }

  return (
    <div className="px-4 pb-8 pt-2 w-full max-w-3xl mx-auto font-sans">
      <div 
        className={`relative group bg-zinc-900/80 backdrop-blur-xl rounded-[26px] border transition-all duration-300 ${
          isFocused 
            ? 'border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900' 
            : 'border-zinc-800 shadow-xl'
        }`}
      >
        
        {/* Attachment Preview Area */}
        {attachments.length > 0 && (
          <div className="px-4 pt-4 flex gap-3 overflow-x-auto scrollbar-hide">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group/att shrink-0 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-950 relative">
                    <img 
                    src={att.previewUrl} 
                    alt="attachment" 
                    className="w-full h-full object-cover opacity-90"
                    />
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-0.5 border border-zinc-700 shadow-sm opacity-0 group-hover/att:opacity-100 transition-opacity"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isListening ? "正在听..." : "输入消息..."}
          className={`w-full bg-transparent text-zinc-100 placeholder-zinc-500 px-5 py-4 focus:outline-none resize-none min-h-[56px] max-h-[200px] text-[15px] leading-relaxed rounded-[26px] ${isListening ? 'animate-pulse text-emerald-400' : ''}`}
          rows={1}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pl-4">
          
          <div className="flex items-center gap-1">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-all"
                title="添加媒体"
            >
              <Plus size={18} strokeWidth={2} />
            </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-all hidden sm:block"
                title="上传图片"
            >
              <ImageIcon size={18} strokeWidth={2} />
            </button>
             <button 
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all hidden sm:block ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title="语音输入"
            >
              {isListening ? <MicOff size={18} strokeWidth={2} /> : <Mic size={18} strokeWidth={2} />}
            </button>
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSend}
              disabled={isLoading || (!text && attachments.length === 0)}
              className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                text || attachments.length > 0
                  ? 'bg-zinc-100 text-zinc-900 hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
                  : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-4 flex items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-500">
         <span className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">模型: {modelName}</span>
      </div>
    </div>
  );
};