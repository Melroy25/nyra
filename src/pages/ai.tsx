import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Sparkles, Send, Mic, ArrowUp, Menu, X, Edit3, Trash2, ListFilter, 
  Volume2, Copy, Smile, Image, Moon, Sun, Bell, Check, ChevronRight, Plus, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiAiChat, apiGetAiThreads, apiCreateAiThread, apiRenameAiThread, apiDeleteAiThread, apiGetAiMessages } from '../lib/api';

interface AiMessage {
  id: string;
  senderId: 'user' | 'nyra-ai';
  text: string;
  timestamp: string;
  reaction?: string;
}

interface AiThread {
  id: string;
  title: string;
  messages: AiMessage[];
}

export default function AIPage() {
  const { user, darkMode, toggleDarkMode } = useStore();

  const [threads, setThreads] = useState<AiThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showThreadsDrawer, setShowThreadsDrawer] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Audio state
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  
  // Reaction picker state
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          // Load messages for first thread
          loadMessages(mapped[0].id, mapped);
        } else {
          // Create first thread
          apiCreateAiThread('Nyra Wellness Companion')
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
      }));
      const targetThreads = currentThreads || threads;
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: formatted } : t));
    } catch {}
    setIsLoadingThreads(false);
  };

  // Switch thread and load messages
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

  const handleSend = async () => {
    if (!inputVal.trim() || isTyping) return;
    const text = inputVal.trim();
    setInputVal('');
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('nyra_token') : null;
    if (!token) {
      alert('Please log in to use Nyra AI.');
      return;
    }

    // Optimistically add user message
    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      senderId: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, userMsg] } : t));
    setIsTyping(true);

    try {
      const { reply } = await apiAiChat(activeThread?.id || 'auto', text, 'nyra');
      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        senderId: 'nyra-ai',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, aiMsg] } : t));
    } catch (err: any) {
      const errMsg: AiMessage = {
        id: `err-${Date.now()}`,
        senderId: 'nyra-ai',
        text: 'I had trouble connecting right now. Please check your internet connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setThreads(prev => prev.map(t => t.id === activeThread?.id ? { ...t, messages: [...t.messages, errMsg] } : t));
    } finally {
      setIsTyping(false);
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

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setSpeakingMessageId(msgId);
    setTimeout(() => setSpeakingMessageId(null), 1000);
  };

  const handleSpeakText = (text: string, msgId: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (speakingMessageId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(msgId);
      }
    } else {
      setSpeakingMessageId(speakingMessageId === msgId ? null : msgId);
    }
  };

  const handleScrollToMessage = (msgId: string) => {
    messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowOutline(false);
  };

  // Compile outline of user prompts
  const promptsOutline = messages
    .filter((m) => m.senderId === 'user')
    .map((m, idx) => ({
      id: m.id,
      index: idx + 1,
      text: m.text,
    }));

  const getFormatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  if (isLoadingThreads) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-on-surface-variant">Loading Nyra AI...</p>
      </div>
    );
  }

  return (
    <div className="-mx-container-padding-mobile md:-mx-container-padding-desktop -mt-stack-md -mb-20 px-4 pt-4 pb-[90px] flex flex-col min-h-[calc(100vh-4.5rem)] relative overflow-hidden bg-white/60 dark:bg-[#100c20]/95">
      
      {/* Top chat bar */}
      <section className="flex justify-between items-center bg-white/40 dark:bg-surface-container/45 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl px-4 py-3.5 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowThreadsDrawer(true)}
            className="p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors"
            title="Chat Threads"
          >
            <Menu className="w-5 h-5 text-on-surface" />
          </button>
          <img src="/logo.png" alt="Nyra Logo" className="w-8 h-8 rounded-full object-cover border border-white" />
          <div>
            <h2 className="font-serif font-bold text-sm text-on-surface">{activeThread?.title || 'Nyra AI'}</h2>
            <span className="text-[9px] font-bold text-primary dark:text-inverse-primary uppercase tracking-wider block">Nyra Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowOutline(!showOutline)}
            className={`p-2 rounded-xl transition-colors ${showOutline ? 'bg-primary/15 text-primary' : 'hover:bg-white/60 dark:hover:bg-white/10'}`}
            title="Chat Outline index"
          >
            <ListFilter className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleDarkMode}
            className="p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Messages */}
      <section className="flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar py-2 min-h-[350px]">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-on-surface mb-1">Hello{user?.name ? `, ${user.name}` : ''}! 🌸</h3>
              <p className="text-sm text-on-surface-variant font-medium">I'm Nyra, your wellness companion.<br/>Ask me anything about your cycle, health, or mood!</p>
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.senderId === 'user';
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div 
              key={msg.id}
              ref={(el) => { messageRefs.current[msg.id] = el; }}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} relative group`}
            >
              <div className="max-w-[85%] flex flex-col gap-1.5 relative">
                
                {/* Bubble Container */}
                <div 
                  onDoubleClick={() => setReactionMsgId(msg.id)}
                  className={`rounded-2xl px-5 py-4 text-sm font-semibold border leading-relaxed relative cursor-pointer select-none transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-primary to-secondary text-white border-primary/20 rounded-tr-sm shadow-md'
                      : 'glass-card text-on-surface dark:bg-[#1c1230]/85 border-white/60 dark:border-white/10 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {/* Speaker glowing effect */}
                  {!isUser && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-tertiary"></div>
                  )}

                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Reaction icon badge */}
                  {msg.reaction && (
                    <div className="absolute -bottom-2 right-3 bg-white dark:bg-surface-container-high border border-outline-variant/35 shadow-md rounded-full px-2 py-0.5 text-xs animate-bounce">
                      {msg.reaction}
                    </div>
                  )}
                </div>

                {/* Sub-toolbar below bubble */}
                <div className={`flex items-center gap-3 px-2 text-[10px] font-bold text-on-surface-variant/75 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <button 
                    onClick={() => handleSpeakText(msg.text, msg.id)}
                    className={`hover:text-primary transition-colors p-0.5 rounded ${isSpeaking ? 'text-primary scale-110' : ''}`}
                    title="Read Aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    className="hover:text-primary transition-colors p-0.5 rounded"
                    title="Copy Text"
                  >
                    {isSpeaking && speakingMessageId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span>{getFormatTime(msg.timestamp)}</span>
                </div>

                {/* Double click Reaction Popup */}
                <AnimatePresence>
                  {reactionMsgId === msg.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute -top-10 left-4 bg-white dark:bg-surface-container-high border border-outline-variant/30 rounded-full px-2 py-1 shadow-xl flex gap-1.5 z-40"
                    >
                      {['🌸', '💖', '🥺', '🧸', '🍫', '👍'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setThreads(prev => prev.map(t => t.id === activeThread?.id ? {
                              ...t,
                              messages: t.messages.map(m => m.id === msg.id ? { ...m, reaction: emoji } : m)
                            } : t));
                            setReactionMsgId(null);
                          }}
                          className="text-sm hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button 
                        onClick={() => setReactionMsgId(null)}
                        className="text-xs text-on-surface-variant hover:text-error"
                      >
                        <X className="w-3 h-3 ml-1" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          );
        })}

        {/* Typing loading bubbles */}
        {isTyping && (
          <div className="flex justify-start w-full">
            <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-3.5 border border-white/60 dark:border-white/10 shadow-sm relative flex items-center gap-1.5 min-w-[70px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-tertiary"></div>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </section>

      {/* Floating Prompt input bar */}
      <section className="fixed bottom-[88px] left-0 right-0 px-container-padding-mobile md:px-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent dark:from-[#0d0818] dark:via-[#0d0818]/95 pt-4 pb-2">
        <div className="max-w-[760px] mx-auto relative flex items-center gap-2">

          <div className="flex-1 glass-panel rounded-full p-2 flex items-center gap-2 border border-white/80 dark:border-white/10 shadow-lg relative">
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask Nyra about your symptoms, cramps..."
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-semibold text-on-surface placeholder-on-surface-variant/40 px-3 h-10"
            />
            
            <button 
              onClick={handleSend}
              disabled={isTyping || !inputVal.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shrink-0 shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </div>
        </div>
      </section>

      {/* LEFT DRAWER: MULTIPLE CHAT THREADS LIST */}
      <AnimatePresence>
        {showThreadsDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThreadsDrawer(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-[#100c20] border-r border-outline-variant/30 shadow-2xl z-50 p-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif font-bold text-xl text-on-surface">Chat Threads</h3>
                  <button 
                    onClick={() => setShowThreadsDrawer(false)}
                    className="p-1 hover:bg-outline-variant/30 rounded-full text-on-surface-variant"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* + New Chat Button */}
                <button
                  onClick={handleCreateNewChat}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm py-3.5 rounded-full shadow-md shadow-primary/10 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>

                {/* Threads list */}
                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[60vh]">
                  {threads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const isEditing = editingThreadId === thread.id;
                    const lastMsg = thread.messages[thread.messages.length - 1]?.text || 'No messages yet';

                    return (
                      <div
                        key={thread.id}
                        onClick={() => !isEditing && handleSelectThread(thread.id)}
                        className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'border-outline-variant/40 hover:bg-white/40'
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
                              className="flex-1 bg-white border border-primary text-xs font-semibold px-2 py-1 rounded"
                            />
                          ) : (
                            <span className="font-bold text-xs text-on-surface truncate">{thread.title}</span>
                          )}

                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => handleStartRename(thread.id, thread.title, e)}
                              className="text-on-surface-variant hover:text-primary p-0.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {threads.length > 1 && (
                              <button 
                                onClick={(e) => handleDelete(thread.id, e)}
                                className="text-on-surface-variant hover:text-error p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-on-surface-variant font-semibold truncate mt-1.5">
                          {lastMsg}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-center text-on-surface-variant font-bold">
                NYRA SECURE AI SYSTEM
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* OUTLINE INDEX */}
      <AnimatePresence>
        {showOutline && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOutline(false)}
              className="fixed inset-0 bg-black/10 backdrop-blur-xs z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed right-4 top-20 w-80 bg-white dark:bg-[#1c1230] rounded-2xl border border-outline-variant/30 shadow-2xl p-5 z-40 flex flex-col gap-4 max-h-[60vh] overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-primary">Chat Outline Index</span>
                <button onClick={() => setShowOutline(false)} className="text-on-surface hover:text-error">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {promptsOutline.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pr-1 flex-1">
                  {promptsOutline.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleScrollToMessage(prompt.id)}
                      className="text-left flex items-start gap-2.5 p-2 hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/20 text-xs font-semibold text-on-surface transition-all group"
                    >
                      <span className="font-bold text-primary shrink-0">#{prompt.index}</span>
                      <span className="truncate group-hover:text-primary">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic py-6 text-center">
                  Ask questions to populate prompt indexes.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
