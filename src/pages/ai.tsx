import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { 
  Sparkles, ArrowUp, Menu, X, Edit3, Trash2, ListFilter, 
  Volume2, Copy, Moon, Sun, Check, CheckCheck, Plus, Loader2, ArrowLeft, Smile, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiAiChat, apiGetAiThreads, apiCreateAiThread, apiRenameAiThread, apiDeleteAiThread, apiGetAiMessages } from '../lib/api';

interface AiMessage {
  id: string;
  senderId: 'user' | 'nyra-ai';
  text: string;
  timestamp: string;
  reaction?: string;
  isRead?: boolean;
  imageUrl?: string;
}

interface AiThread {
  id: string;
  title: string;
  messages: AiMessage[];
}

const EMOJI_REACTIONS = ['❤️', '😊', '🌸', '🙏', '💜', '👍'];

export default function AIPage() {
  const router = useRouter();
  const { user, darkMode, toggleDarkMode } = useStore();

  const [threads, setThreads] = useState<AiThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  
  const [inputVal, setInputVal] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showThreadsDrawer, setShowThreadsDrawer] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Reaction picker
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [reactionPos, setReactionPos] = useState({ x: 0, y: 0 });

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread?.messages || [];

  // Load threads from backend on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nyra_token') : null;
    if (!token) { setIsLoadingThreads(false); return; }
    
    apiGetAiThreads()
      .then(({ threads: backendThreads }) => {
        if (backendThreads && backendThreads.length > 0) {
          const mapped: AiThread[] = backendThreads.map((t: any) => ({
            id: t.id,
            title: t.title || 'Nyra Chat',
            messages: [],
          }));
          setThreads(mapped);
          setActiveThreadId(mapped[0].id);
          loadMessages(mapped[0].id, mapped);
        } else {
          apiCreateAiThread('Nyra Wellness Chat')
            .then(({ thread }) => {
              const newThread: AiThread = { id: thread.id, title: thread.title, messages: [] };
              setThreads([newThread]);
              setActiveThreadId(thread.id);
            })
            .catch(() => {})
            .finally(() => setIsLoadingThreads(false));
        }
      })
      .catch(() => setIsLoadingThreads(false));
  }, []);

  const loadMessages = async (threadId: string, currentThreads?: AiThread[]) => {
    try {
      const { messages: msgs } = await apiGetAiMessages(threadId);
      const formatted: AiMessage[] = (msgs || []).map((m: any) => ({
        id: m.id,
        senderId: m.role === 'user' ? 'user' : 'nyra-ai',
        text: m.content,
        timestamp: m.created_at || new Date().toISOString(),
        isRead: true,
      }));
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: formatted } : t));
    } catch {}
    setIsLoadingThreads(false);
  };

  const handleSelectThread = async (id: string) => {
    setActiveThreadId(id);
    setShowThreadsDrawer(false);
    const thread = threads.find(t => t.id === id);
    if (thread && thread.messages.length === 0) {
      await loadMessages(id);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!inputVal.trim() && !selectedImage) || isTyping) return;
    const text = inputVal.trim() || 'Analyzed attached image.';
    const attachedImage = selectedImage;
    setInputVal('');
    setSelectedImage(null);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('nyra_token') : null;
    if (!token) {
      alert('Please log in to use Nyra AI.');
      return;
    }

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      senderId: 'user',
      text,
      imageUrl: attachedImage || undefined,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, userMsg] } : t));
    setIsTyping(true);

    try {
      const { reply } = await apiAiChat(activeThread?.id || 'auto', text, 'nyra', attachedImage || undefined);
      // Mark user message as delivered
      setThreads(prev => prev.map(t => t.id === activeThread?.id 
        ? { ...t, messages: t.messages.map(m => m.id === userMsg.id ? { ...m, isRead: true } : m) }
        : t));
      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        senderId: 'nyra-ai',
        text: reply,
        timestamp: new Date().toISOString(),
        isRead: true,
      };
      setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, aiMsg] } : t));
    } catch (err: any) {
      const errMsg: AiMessage = {
        id: `err-${Date.now()}`,
        senderId: 'nyra-ai',
        text: "I'm having a bit of trouble connecting right now. Could you try again in a moment? 🌸",
        timestamp: new Date().toISOString(),
        isRead: true,
      };
      setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, errMsg] } : t));
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const { thread } = await apiCreateAiThread();
      const newThread: AiThread = { id: thread.id, title: thread.title || 'New Chat', messages: [] };
      setThreads(prev => [...prev, newThread]);
      setActiveThreadId(thread.id);
    } catch {}
    setShowThreadsDrawer(false);
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = async (id: string) => {
    if (editingTitle.trim()) {
      try {
        await apiRenameAiThread(id, editingTitle.trim());
        setThreads(prev => prev.map(t => t.id === id ? { ...t, title: editingTitle.trim() } : t));
      } catch {}
    }
    setEditingThreadId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDeleteAiThread(id);
      const remaining = threads.filter(t => t.id !== id);
      setThreads(remaining);
      if (activeThreadId === id && remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
      }
    } catch {}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSpeak = (text: string, id: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
      } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => setSpeakingId(null);
        window.speechSynthesis.speak(u);
        setSpeakingId(id);
      }
    }
  };

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setReactionPos({ x: rect.left, y: rect.top });
    setReactionTarget(msgId);
  };

  const handleReact = (msgId: string, emoji: string) => {
    setThreads(prev => prev.map(t => t.id === activeThread?.id ? {
      ...t,
      messages: t.messages.map(m => m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m)
    } : t));
    setReactionTarget(null);
  };

  const handleScrollToMessage = (msgId: string) => {
    messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowOutline(false);
  };

  const promptsOutline = messages
    .filter((m) => m.senderId === 'user')
    .map((m, idx) => ({ id: m.id, index: idx + 1, text: m.text }));

  const getTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
  };

  // Quick prompt suggestions
  const quickPrompts = [
    { icon: '🌸', text: 'Cramp relief tips?' },
    { icon: '🍫', text: 'Foods for my phase?' },
    { icon: '🧘', text: 'Gentle workouts?' },
    { icon: '✨', text: 'Mood & comfort tips?' },
    { icon: '💧', text: 'Hydration advice?' },
    { icon: '😴', text: 'Help me sleep better' },
  ];

  if (isLoadingThreads) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0514]/80">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-white/80">Loading Nyra AI...</p>
        </div>
      </div>
    );
  }

  return (
    /* Floating border gap container */
    <div className="fixed inset-0 z-50 p-2 sm:p-3 bg-[#0a0514]/70 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full h-full max-w-2xl bg-[#f5f0ff] dark:bg-[#0d0820] rounded-3xl border border-black/8 dark:border-[#2a1f45]/80 shadow-2xl flex flex-col overflow-hidden relative">

        {/* ── TOP BAR (Like chat header) ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#160e2e] border-b border-black/8 dark:border-[#2a1f45]/60 shadow-sm shrink-0">
          {/* Back */}
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 -ml-1 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3d2a6b] dark:text-[#c8bedd]" />
          </button>

          {/* Nyra Avatar with online indicator */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-md border-2 border-white dark:border-[#2a1f45]">
              <img src="/logo.png" alt="Nyra" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
              <Sparkles className="w-5 h-5 text-white absolute" style={{display: 'none'}} />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-[#160e2e] rounded-full" />
          </div>

          {/* Name & status */}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[15px] text-[#18003d] dark:text-[#eee6ff] leading-tight">Nyra</h2>
            <p className="text-[11px] text-green-500 font-semibold">
              {isTyping ? (
                <span className="text-primary animate-pulse">typing...</span>
              ) : 'Online'}
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowThreadsDrawer(true)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
              title="Chat Threads"
            >
              <Menu className="w-5 h-5 text-[#7c3aed]" />
            </button>
            <button
              onClick={handleCreateNewChat}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5 text-[#7c3aed]" />
            </button>
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`p-2 rounded-full transition-colors ${showOutline ? 'bg-primary/15' : 'hover:bg-black/5 dark:hover:bg-white/8'}`}
              title="Prompt Index"
            >
              <ListFilter className="w-5 h-5 text-[#7c3aed]" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7c3aed]" />}
            </button>
          </div>
        </div>

        {/* ── QUICK PROMPTS BAR ── */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto no-scrollbar bg-white/60 dark:bg-[#160e2e]/80 border-b border-black/5 dark:border-[#2a1f45]/40 shrink-0">
          {quickPrompts.map((q) => (
            <button
              key={q.text}
              onClick={() => {
                setInputVal(q.text);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0e6ff] dark:bg-[#2a1f45] text-[#7c3aed] dark:text-[#c4aaff] text-[11px] font-bold shrink-0 hover:bg-[#e4d1ff] dark:hover:bg-[#3a2d58] transition-colors border border-[#d4b8ff]/40 dark:border-[#3a2d58]"
            >
              <span>{q.icon}</span>
              <span>{q.text}</span>
            </button>
          ))}
        </div>

        {/* ── MESSAGES ── */}
        <div
          className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1"
          style={{ background: darkMode ? 'linear-gradient(180deg, #0d0820 0%, #130a2a 100%)' : 'linear-gradient(180deg, #f7f2ff 0%, #f0e9ff 100%)' }}
          onClick={() => setReactionTarget(null)}
        >
          {/* Empty state */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-xl"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <div>
                <h3 className="font-bold text-xl text-[#18003d] dark:text-[#eee6ff] mb-1">
                  Hey{user?.name ? `, ${user.name}` : ''}! 🌸
                </h3>
                <p className="text-[13px] text-[#6b5b95] dark:text-[#9d8fc0] font-medium leading-relaxed">
                  I'm Nyra, your personal wellness companion.<br />
                  Ask me anything — about your cycle, mood, health,<br />
                  or just chat! I'm here for you. 💜
                </p>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, idx) => {
            const isUser = msg.senderId === 'user';
            const prevMsg = messages[idx - 1];
            const showAvatar = !isUser && (idx === 0 || prevMsg?.senderId !== 'nyra-ai');
            const isGrouped = !isUser && idx > 0 && prevMsg?.senderId === 'nyra-ai';

            return (
              <motion.div
                key={msg.id}
                ref={(el) => { messageRefs.current[msg.id] = el; }}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
              >
                {/* Nyra avatar */}
                {!isUser && (
                  <div className="w-8 shrink-0 mr-1.5 flex items-end">
                    {showAvatar ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-sm border border-white/30 overflow-hidden">
                        <img src="/logo.png" alt="Nyra" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                      </div>
                    ) : <div className="w-8" />}
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[75%] relative group`}>
                  <div
                    onContextMenu={(e) => { e.preventDefault(); handleLongPress(e, msg.id); }}
                    onDoubleClick={(e) => handleLongPress(e, msg.id)}
                    className={`
                      px-4 py-2.5 rounded-2xl text-[13.5px] font-medium leading-relaxed relative select-none cursor-pointer
                      ${isUser
                        ? 'bg-[#7c3aed] text-white rounded-tr-sm shadow-md shadow-[#7c3aed]/20'
                        : 'bg-white dark:bg-[#1e1538] text-[#18003d] dark:text-[#eee6ff] rounded-tl-sm shadow-sm border border-black/5 dark:border-[#3a2d58]/50'
                      }
                      ${isGrouped && isUser ? 'rounded-tr-2xl' : ''}
                      ${isGrouped && !isUser ? 'rounded-tl-2xl' : ''}
                    `}
                  >
                    {/* Nyra vertical bar accent */}
                    {!isUser && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#a855f7] to-[#7c3aed] rounded-full" />
                    )}
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl">
                        <img
                          src={msg.imageUrl}
                          alt="Attached"
                          className="max-h-48 w-auto rounded-xl object-cover border border-black/10 dark:border-white/10"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-line pl-[2px]">{msg.text}</p>

                    {/* Reaction badge */}
                    {msg.reaction && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReact(msg.id, msg.reaction!); }}
                        className="absolute -bottom-3 -right-1 bg-white dark:bg-[#2a1f45] rounded-full px-1.5 py-0.5 text-sm border border-black/8 dark:border-[#3a2d58] shadow-sm"
                      >
                        {msg.reaction}
                      </button>
                    )}
                  </div>

                  {/* Time + status row */}
                  <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="text-[#9d8fc0] hover:text-[#7c3aed] transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                    {/* Speak */}
                    <button
                      onClick={() => handleSpeak(msg.text, msg.id)}
                      className={`transition-colors ${speakingId === msg.id ? 'text-[#7c3aed] animate-pulse' : 'text-[#9d8fc0] hover:text-[#7c3aed]'}`}
                      title={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Time */}
                    <span className="text-[10px] text-[#9d8fc0] dark:text-[#6b5b95]">{getTime(msg.timestamp)}</span>
                    {/* Read ticks (user only) */}
                    {isUser && (
                      msg.isRead
                        ? <CheckCheck className="w-3 h-3 text-[#7c3aed]" />
                        : <Check className="w-3 h-3 text-[#9d8fc0]" />
                    )}
                  </div>
                </div>

                {/* User avatar */}
                {isUser && (
                  <div className="w-8 shrink-0 ml-1.5 flex items-end">
                    {(idx === 0 || prevMsg?.senderId !== 'user') ? (
                      user?.avatarUrl
                        ? <img src={user.avatarUrl} alt="You" className="w-8 h-8 rounded-full object-cover border-2 border-[#7c3aed]/30 shadow-sm" />
                        : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e879f9] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                    ) : <div className="w-8" />}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing indicator (like WhatsApp/iMessage) */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                className="flex items-end gap-1.5 mt-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-sm border border-white/30 overflow-hidden shrink-0">
                  <img src="/logo.png" alt="Nyra" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                </div>
                <div className="bg-white dark:bg-[#1e1538] border border-black/5 dark:border-[#3a2d58]/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>

        {/* ── INPUT BAR (like chat) ── */}
        <div className="bg-white dark:bg-[#160e2e] px-3 py-3 border-t border-black/8 dark:border-[#2a1f45]/60 shrink-0 flex flex-col gap-2">
          {/* Image Preview Badge */}
          {selectedImage && (
            <div className="relative inline-block w-20 h-20 rounded-xl overflow-hidden border-2 border-[#7c3aed] shadow-md ml-2">
              <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Image Attachment Button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2 text-[#9d8fc0] hover:text-[#7c3aed] transition-colors shrink-0"
              title="Attach image for Nyra AI"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={selectedImage ? `Ask Nyra AI about this image...` : `Message Nyra...`}
              className="flex-1 px-4 py-2.5 rounded-full border border-black/10 dark:border-[#2a1f45] bg-[#f5f0ff] dark:bg-[#1e1538] text-[#18003d] dark:text-[#eee6ff] placeholder-[#9d8fc0] dark:placeholder-[#6b5b95] text-[13px] font-medium outline-none focus:border-[#7c3aed]/50 focus:ring-2 focus:ring-[#7c3aed]/10 transition-all"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isTyping || (!inputVal.trim() && !selectedImage)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white flex items-center justify-center shadow-md shadow-[#7c3aed]/30 active:scale-90 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isTyping
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              }
            </button>
          </div>
        </div>

        {/* ── REACTION EMOJI PICKER ── */}
        <AnimatePresence>
          {reactionTarget && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReactionTarget(null)}
                className="fixed inset-0 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                className="fixed z-50 bottom-28 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e1538] rounded-full px-3 py-2 flex gap-2 shadow-2xl border border-black/8 dark:border-[#3a2d58]/50"
              >
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(reactionTarget, emoji)}
                    className="text-xl hover:scale-125 active:scale-90 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="w-px bg-black/10 dark:bg-white/10 mx-1" />
                <button
                  onClick={() => setReactionTarget(null)}
                  className="text-[#9d8fc0] hover:text-error p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── LEFT DRAWER: CHAT THREADS ── */}
        <AnimatePresence>
          {showThreadsDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowThreadsDrawer(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0d0820] border-r border-black/8 dark:border-[#2a1f45] shadow-2xl z-50 p-5 flex flex-col"
              >
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">Chat Threads</h3>
                  <button onClick={() => setShowThreadsDrawer(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/8 rounded-full">
                    <X className="w-5 h-5 text-[#9d8fc0]" />
                  </button>
                </div>

                <button
                  onClick={handleCreateNewChat}
                  className="w-full bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-bold text-sm py-3 rounded-2xl shadow-md mb-4 flex items-center justify-center gap-2 hover:opacity-95"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>

                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1">
                  {threads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const isEditing = editingThreadId === thread.id;
                    const lastMsg = thread.messages[thread.messages.length - 1]?.text || 'No messages yet';

                    return (
                      <div
                        key={thread.id}
                        onClick={() => !isEditing && handleSelectThread(thread.id)}
                        className={`flex flex-col p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#f0e6ff] dark:bg-[#2a1f45]/60 border-[#7c3aed]/30'
                            : 'border-black/8 dark:border-[#2a1f45] hover:bg-black/3 dark:hover:bg-white/3'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleSaveRename(thread.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(thread.id)}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-white border border-[#7c3aed]/30 text-xs font-semibold px-2 py-1 rounded-lg outline-none"
                            />
                          ) : (
                            <span className={`font-bold text-xs truncate ${isActive ? 'text-[#7c3aed]' : 'text-[#18003d] dark:text-[#eee6ff]'}`}>
                              {thread.title}
                            </span>
                          )}
                          <div className="flex gap-1 shrink-0">
                            <button onClick={(e) => handleStartRename(thread.id, thread.title, e)} className="text-[#9d8fc0] hover:text-[#7c3aed] p-0.5">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {threads.length > 1 && (
                              <button onClick={(e) => handleDelete(thread.id, e)} className="text-[#9d8fc0] hover:text-red-500 p-0.5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-[#9d8fc0] truncate mt-1">{lastMsg}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-center text-[#9d8fc0] font-bold mt-4 uppercase tracking-wider">
                  Nyra Secure AI System
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── PROMPT INDEX OUTLINE ── */}
        <AnimatePresence>
          {showOutline && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOutline(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute right-4 top-16 w-72 bg-white dark:bg-[#1e1538] rounded-2xl border border-black/8 dark:border-[#3a2d58]/50 shadow-2xl p-4 z-40 max-h-[55vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-black/8 dark:border-[#3a2d58]/40">
                  <span className="font-bold text-xs text-[#7c3aed] uppercase tracking-wider">Prompt Index</span>
                  <button onClick={() => setShowOutline(false)}>
                    <X className="w-4 h-4 text-[#9d8fc0]" />
                  </button>
                </div>
                {promptsOutline.length > 0 ? (
                  <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1">
                    {promptsOutline.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleScrollToMessage(p.id)}
                        className="text-left flex items-start gap-2 p-2 hover:bg-[#f0e6ff] dark:hover:bg-[#2a1f45]/50 rounded-xl text-[12px] font-medium text-[#18003d] dark:text-[#eee6ff] transition-colors group"
                      >
                        <span className="font-bold text-[#7c3aed] shrink-0">#{p.index}</span>
                        <span className="truncate group-hover:text-[#7c3aed]">{p.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9d8fc0] italic text-center py-6">
                    Ask questions to populate the index.
                  </p>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
