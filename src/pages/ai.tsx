import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Sparkles, Send, Mic, ArrowUp, Menu, X, Edit3, Trash2, ListFilter, 
  Volume2, Copy, Smile, Image, Moon, Sun, Bell, Check, ChevronRight, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIPage() {
  const { 
    chatThreads, 
    activeThreadId, 
    createChatThread, 
    renameChatThread, 
    deleteChatThread, 
    addMessage, 
    addReaction,
    darkMode,
    toggleDarkMode
  } = useStore();

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

  const activeThread = chatThreads.find((t) => t.id === activeThreadId) || chatThreads[0];
  const messages = activeThread?.messages || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setIsTyping(true);
    addMessage(inputVal.trim());
    setInputVal('');

    // Simulate AI response delay
    setTimeout(() => {
      setIsTyping(false);
    }, 1600);
  };

  const handleCreateNewChat = () => {
    createChatThread();
    setShowThreadsDrawer(false);
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      renameChatThread(id, editingTitle.trim());
    }
    setEditingThreadId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatThread(id);
  };

  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    // Simple alert or temp visual change can indicate copy success
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
      // Simulate
      setSpeakingMessageId(speakingMessageId === msgId ? null : msgId);
    }
  };

  const handleScrollToMessage = (msgId: string) => {
    messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowOutline(false);
  };

  // Compile outline of prompts (User queries)
  const promptsOutline = messages
    .filter((m) => m.senderId === 'user-sarah')
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
      return '20:20';
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-container-padding-mobile pt-4 pb-[130px] flex flex-col min-h-[85vh] relative overflow-hidden">
      
      {/* Top chat bar matching screenshots */}
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
            <h2 className="font-serif font-bold text-sm text-on-surface">{activeThread?.title}</h2>
            <span className="text-[9px] font-bold text-primary dark:text-inverse-primary uppercase tracking-wider block">Nyra Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Outline index selector toggle */}
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

      {/* Messages logs stream */}
      <section className="flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar py-2 min-h-[350px]">
        {messages.map((msg) => {
          const isUser = msg.senderId === 'user-sarah';
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

                {/* Sub-toolbar below bubble: Speaker, Copy, Clock */}
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
                    {isSpeaking && speakingMessageId === msg.id && msg.text !== 'Welcome' ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span>{getFormatTime(msg.timestamp)}</span>
                </div>

                {/* Double click Reaction Popup Selection overlay */}
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
                            addReaction(msg.id, emoji);
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

      {/* Floating Prompt input bar at the bottom */}
      <section className="fixed bottom-[88px] left-0 right-0 px-container-padding-mobile md:px-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent dark:from-[#0d0818] dark:via-[#0d0818]/95 pt-4 pb-2">
        <div className="max-w-[760px] mx-auto relative flex items-center gap-2">
          
          <button className="w-11 h-11 rounded-full glass-card flex items-center justify-center text-on-surface-variant border border-white/50 hover:bg-white transition-colors shrink-0 shadow-sm">
            <Image className="w-5 h-5" />
          </button>

          <div className="flex-1 glass-panel rounded-full p-2 flex items-center gap-2 border border-white/80 dark:border-white/10 shadow-lg relative">
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Nyra about your symptoms, cramps..."
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-semibold text-on-surface placeholder-on-surface-variant/40 px-3 h-10"
            />
            
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white/40 transition-colors shrink-0">
              <Mic className="w-5 h-5" />
            </button>

            <button 
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shrink-0 shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* 1. LEFT DRAWER: MULTIPLE CHAT THREADS LIST */}
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

                {/* + New Chat Button with gradient */}
                <button
                  onClick={handleCreateNewChat}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm py-3.5 rounded-full shadow-md shadow-primary/10 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>

                {/* Threads directories logs */}
                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[60vh]">
                  {chatThreads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const isEditing = editingThreadId === thread.id;
                    const lastMsg = thread.messages[thread.messages.length - 1]?.text || 'No messages yet';

                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          if (!isEditing) {
                            useStore.setState({ activeThreadId: thread.id });
                            setShowThreadsDrawer(false);
                          }
                        }}
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
                            {chatThreads.length > 1 && (
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
                NYRA SECURE CHAT SYSTEM
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. RIGHT / CENTER POPUP DRAWER: OUTLINE CHAT INDEX */}
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
