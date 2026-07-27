import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { 
  Heart, Send, Smile, Info, Sparkles, MessageCircle, ArrowLeft, PlusCircle, Check, CheckCheck, HelpCircle, Bot,
  Menu, ListFilter, Plus, Edit3, Trash2, Volume2, Copy, X, KeyRound, Loader2,
  Eye, EyeOff, RefreshCw, UserCheck, Unlink, Paperclip, FileText, MoreVertical, ChevronDown
} from 'lucide-react';
import { mockStickers, mockReactions } from '../data/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { apiConnectPartner, apiRegenerateCode, apiGetMessages, apiSendMessage, apiAddReaction, apiEditMessage, apiDeleteMessage, apiClearChat, apiGetPartnerDashboard, apiAiChat } from '../lib/api';
import { useRealtimeChat } from '../hooks/useRealtimeChat';

export default function PartnerPage() {
  const router = useRouter();
  const { 
    user, 
    setUser,
    chatThreads, 
    activeThreadId, 
    addMessage, 
    addReaction,
    partnerAiThreads,
    activePartnerAiThreadId,
    setActivePartnerAiThreadId,
    createPartnerAiThread,
    renamePartnerAiThread,
    deletePartnerAiThread,
    addPartnerAiMessage
  } = useStore();

  const activeThread = chatThreads.find((t) => t.id === activeThreadId) || chatThreads[0];
  const [messages, setMessages] = useState<any[]>(activeThread?.messages || []);

  // Active Partner AI Thread
  const activePartnerAiThread = partnerAiThreads.find((t) => t.id === activePartnerAiThreadId) || partnerAiThreads[0];
  const partnerAiMessages = activePartnerAiThread?.messages || [];
  
  const activeTab = (router.query.tab as string) || 'dashboard';

  // Connection input state for partner
  const [inputCode, setInputCode] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');

  // Code Hide / Reveal toggle & Regeneration state
  const [showCode, setShowCode] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenMsg, setRegenMsg] = useState('');

  const handleRegenerateCode = async () => {
    if (isConnected) {
      const confirmAction = window.confirm(
        'Regenerating your connection code will instantly unlink your current partner. Are you sure you want to continue?'
      );
      if (!confirmAction) return;
    }
    setRegenLoading(true);
    setRegenMsg('');
    try {
      const res = await apiRegenerateCode();
      if (res.user && user) {
        setUser({
          ...user,
          partnerCode: res.user.partnerCode,
          connectedPartnerId: undefined,
          connectedPartner: undefined,
        });
      }
      setRegenMsg(`New code generated: ${res.user.partnerCode}. Partner unlinked.`);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate partner code');
    } finally {
      setRegenLoading(false);
    }
  };

  // Private Chat state
  const [chatInput, setChatInput] = useState('');
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [activeMessageIdForReactions, setActiveMessageIdForReactions] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Partner AI Chat state
  const [partnerAiInput, setPartnerAiInput] = useState('');
  const [showAiThreadsDrawer, setShowAiThreadsDrawer] = useState(false);
  const [showAiOutline, setShowAiOutline] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'emojis' | 'stickers'>('emojis');

  // ── Telegram-like message features ──────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [chatPartnerInfo, setChatPartnerInfo] = useState<any>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quickEmojis = ['😊', '❤️', '🌸', '💖', '🧁', '🍫', '🎉', '🔥', '🙏', '😴', '✨', '🧸', '☕', '🌷', '🥰'];

  const handleEmojiClick = (emoji: string) => {
    setChatInput((prev) => prev + emoji);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const openContextMenu = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    e.preventDefault();
    const x = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX || 0;
    const y = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY || 0;
    setContextMenu({ msgId, x, y });
    setActiveMessageIdForReactions(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    setContextMenu(null);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try { await apiDeleteMessage(msgId); } catch (err) { console.log('Delete fallback:', err); }
  };

  const startEditMessage = (msg: any) => {
    setContextMenu(null);
    setEditingMsgId(msg.id);
    setEditText(msg.text || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMsgId) return;
    const updated = editText.trim();
    setMessages((prev) => prev.map((m) => m.id === editingMsgId ? { ...m, text: updated, is_edited: true } : m));
    setEditingMsgId(null);
    setEditText('');
    try { await apiEditMessage(editingMsgId, updated); } catch (err) { console.log('Edit fallback:', err); }
  };

  const handleClearChat = async (clearForMe: boolean) => {
    setShowClearModal(false);
    if (!chatThreadId) return;
    if (clearForMe) {
      setMessages((prev) => prev.filter((m) => !(m.senderId === user?.id || (isPartner && m.senderId === 'partner-john') || (!isPartner && m.senderId === 'user-sarah'))));
    } else {
      setMessages([]);
    }
    try { await apiClearChat(chatThreadId, clearForMe); } catch (err) { console.log('Clear chat fallback:', err); }
  };

  const copyMessage = (text: string) => {
    setContextMenu(null);
    if (text) navigator.clipboard.writeText(text).catch(() => {});
  };

  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dynamic user & partner details
  const isPartner = user?.role === 'partner';
  const myName = user?.name || (isPartner ? 'Royal' : 'Melroy');
  const connectedPartnerName = user?.connectedPartner?.name || (isPartner ? 'Melroy' : 'Royal');
  const trackedUserName = isPartner ? connectedPartnerName : myName;
  const displayPairingCode = user?.partnerCode || '';
  const isConnected = Boolean(user?.connectedPartnerId || user?.connectedPartner);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Live Partner Dashboard Data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      apiGetPartnerDashboard()
        .then((data: any) => {
          setDashboardData(data);
          if (data.partner && user && !user.connectedPartner) {
            setUser({
              ...user,
              connectedPartner: data.partner,
              connectedPartnerId: data.partner.id,
            });
          }
        })
        .catch((err: any) => console.log('Partner dashboard load:', err));
    }
  }, [activeTab]);

  // Polling for live chat messages when on 'chat' tab
  useEffect(() => {
    if (activeTab !== 'chat') return;

    const fetchLiveMessages = () => {
      apiGetMessages('auto')
        .then(({ messages: liveMsgs, threadId, partnerInfo }) => {
          if (threadId) setChatThreadId(threadId);
          if (partnerInfo) setChatPartnerInfo(partnerInfo);
          if (liveMsgs) {
            setMessages((prev) => {
              const formatted = liveMsgs.map((m: any) => ({
                id: m.id,
                senderId: m.sender_id,
                text: m.text,
                sticker: m.sticker,
                reaction: m.reaction,
                mediaUrl: m.media_url,
                mediaType: m.media_type,
                timestamp: m.created_at,
              }));
              // Smart diff check to avoid unnecessary re-renders while typing
              const isDifferent =
                formatted.length !== prev.length ||
                formatted.some(
                  (m, idx) =>
                    prev[idx]?.id !== m.id ||
                    prev[idx]?.reaction !== m.reaction ||
                    prev[idx]?.text !== m.text
                );
              return isDifferent ? formatted : prev;
            });
          }
        })
        .catch(() => {/* fallback */});
    };

    fetchLiveMessages();
    const interval = setInterval(fetchLiveMessages, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'ai') {
      aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerAiMessages, activeTab]);

  // Handle Connecting to Partner via Code
  const handleConnectPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setConnectError('Please enter a valid connection code.');
      return;
    }
    setConnectError('');
    setConnectSuccess('');
    setConnectLoading(true);

    try {
      const res = await apiConnectPartner(inputCode.trim());
      setConnectSuccess(`Successfully connected to ${res.connectedPartner.name}! ❤️`);
      if (user) {
        setUser({
          ...user,
          connectedPartnerId: res.connectedPartner.id,
          connectedPartner: res.connectedPartner,
        });
      }
      setInputCode('');
    } catch (err: any) {
      setConnectError(err.message || 'Invalid or unknown partner code.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const textToSend = chatInput.trim();
    setChatInput('');

    const tempId = `msg-${Date.now()}`;
    const myId = user?.id || (isPartner ? 'partner-john' : 'user-sarah');

    // Add locally immediately so chat is instant and linked
    const newMsg = {
      id: tempId,
      senderId: myId,
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    // Sync with Zustand store
    addMessage(textToSend);

    // Call backend API
    try {
      const { message: sentMsg } = await apiSendMessage('auto', textToSend);
      if (sentMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: sentMsg.id,
                  senderId: sentMsg.sender_id,
                  text: sentMsg.text,
                  sticker: sentMsg.sticker,
                  mediaUrl: sentMsg.media_url,
                  mediaType: sentMsg.media_type,
                  timestamp: sentMsg.created_at,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.log('Chat backend sync fallback:', err);
    }
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let dataUrl = '';
    let mediaType = 'document';
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
      dataUrl = await compressImageFile(file);
    } else {
      mediaType = file.type.startsWith('video/') ? 'video' : 'document';
      dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target?.result as string);
        r.readAsDataURL(file);
      });
    }

    if (!dataUrl) return;

    const tempId = `msg-${Date.now()}`;
    const myId = user?.id || (isPartner ? 'partner-john' : 'user-sarah');

    const newMsg = {
      id: tempId,
      senderId: myId,
      text: chatInput.trim() || '',
      mediaUrl: dataUrl,
      mediaType,
      timestamp: new Date().toISOString(),
    };

    // Add to local state immediately so pic/attachment shows instantly
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    try {
      const { message: sentMsg } = await apiSendMessage(
        'auto',
        chatInput.trim() || undefined,
        undefined,
        dataUrl,
        mediaType
      );
      if (sentMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: sentMsg.id,
                  senderId: sentMsg.sender_id,
                  text: sentMsg.text,
                  sticker: sentMsg.sticker,
                  mediaUrl: sentMsg.media_url,
                  mediaType: sentMsg.media_type,
                  timestamp: sentMsg.created_at,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.log('Attachment upload fallback:', err);
    }
  };

  const handleSendSticker = async (stickerLabel: string) => {
    const tempId = `msg-${Date.now()}`;
    const myId = user?.id || (isPartner ? 'partner-john' : 'user-sarah');

    const newMsg = {
      id: tempId,
      senderId: myId,
      text: '',
      sticker: stickerLabel,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    addMessage('', stickerLabel);
    setShowStickerDrawer(false);

    try {
      await apiSendMessage('auto', undefined, stickerLabel);
    } catch (err) {
      console.log('Sticker backend sync fallback:', err);
    }
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
    setActiveMessageIdForReactions(null);
  };

  // Handle Partner AI Chat query (real API call)
  const [isPartnerAiTyping, setIsPartnerAiTyping] = useState(false);
  const handleSendPartnerAi = async (promptText?: string) => {
    const textToSend = promptText || partnerAiInput;
    if (!textToSend.trim() || isPartnerAiTyping) return;
    if (!promptText) setPartnerAiInput('');

    // Optimistically add user message
    const userMsg = {
      id: `u-${Date.now()}`,
      senderId: user?.id || 'user',
      text: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };
    addPartnerAiMessage(textToSend.trim());
    setIsPartnerAiTyping(true);

    try {
      const { reply } = await apiAiChat(activePartnerAiThread?.id || 'auto', textToSend.trim(), 'partner');
      // Add AI reply
      const aiMsg = {
        id: `ai-${Date.now()}`,
        senderId: 'nyra-ai',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      addPartnerAiMessage(reply);
    } catch {
      addPartnerAiMessage('I had trouble connecting. Please check your internet and try again.');
    } finally {
      setIsPartnerAiTyping(false);
    }
  };

  // Partner AI Thread Handlers
  const handleCreateNewAiChat = () => {
    createPartnerAiThread();
    setShowAiThreadsDrawer(false);
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      renamePartnerAiThread(id, editingTitle.trim());
    }
    setEditingThreadId(null);
  };

  const handleDeleteAiThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePartnerAiThread(id);
  };

  const scrollToMessage = (msgId: string) => {
    messageRefs.current[msgId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowAiOutline(false);
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
    }
  };

  // Filter user prompts for Outline index
  const userPrompts = partnerAiMessages.filter((m) => m.senderId === user?.id || m.senderId === 'user' || m.senderId === 'partner-john');

  // True if this message was sent by the currently logged-in user
  const isMsgSentByMe = (msg: any) => {
    if (user?.id && msg.senderId === user.id) return true;
    if (!user?.id) {
      return isPartner ? msg.senderId === 'partner-john' : msg.senderId === 'user-sarah';
    }
    return false;
  };

  return (
    <div className={`max-w-[1000px] mx-auto px-container-padding-mobile ${activeTab === 'ai' ? 'pt-2 pb-6' : activeTab === 'chat' ? '' : 'pt-stack-md pb-12'} transition-colors duration-300`}>
      
      <AnimatePresence mode="wait">

        {/* ── 1. PARTNER DASHBOARD VIEW ── */}
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-stack-lg"
          >
            {/* Header section */}
            <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-entrance">
              <div>
                <h1 className="font-serif font-bold text-3xl md:text-5xl text-[#18003d] dark:text-[#eee6ff]">Partner Mode</h1>
                <p className="text-sm text-[#3d3050] dark:text-[#c8bedd] font-medium mt-1">
                  {!isPartner 
                    ? 'Share specific cycle insights securely with your partner.' 
                    : `${trackedUserName}'s cycle phase updates & wellness tracker.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => router.push('/partner?tab=chat')}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 hover:opacity-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> Open Chat
                </button>
                {isPartner && (
                  <button 
                    onClick={() => router.push('/partner?tab=ai')}
                    className="px-4 py-2.5 rounded-2xl border border-tertiary/40 bg-tertiary/10 text-tertiary font-bold text-xs flex items-center gap-2 hover:bg-tertiary/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> Ask Partner AI
                  </button>
                )}
              </div>
            </section>

            {/* PARTNER CONNECTION CODE CARD (If not connected yet or partner mode) */}
            {isPartner && !isConnected && (
              <div className="glass-card bg-gradient-to-br from-tertiary/10 via-primary/5 to-secondary/10 dark:bg-[#16102a]/90 rounded-2xl p-6 border border-tertiary/30 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-tertiary/20 flex items-center justify-center text-tertiary shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">Connect with {connectedPartnerName}</h3>
                    <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">Enter your partner's connection code to link your accounts.</p>
                  </div>
                </div>

                <form onSubmit={handleConnectPartner} className="flex flex-col sm:flex-row gap-3 mt-4">
                  <input
                    type="text"
                    placeholder="e.g. NYRA-82941"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-tertiary/40 bg-white/90 dark:bg-[#1c1230] text-[#18003d] dark:text-[#eee6ff] text-sm font-bold uppercase tracking-wider outline-none focus:border-tertiary"
                  />
                  <button
                    type="submit"
                    disabled={connectLoading}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-tertiary to-primary text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    {connectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4" /> Link Partner</>}
                  </button>
                </form>

                {connectError && <p className="text-xs font-bold text-red-500 mt-2">{connectError}</p>}
                {connectSuccess && <p className="text-xs font-bold text-primary dark:text-[#d4b8ff] mt-2">{connectSuccess}</p>}
              </div>
            )}

            {!isPartner ? (
              // MAIN USER'S VIEW — Shows Connection Code & Share Options
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                
                {/* Pairing Code Card */}
                <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-primary dark:text-[#d4b8ff] uppercase tracking-wider block">
                        Your Connection Code
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCode(!showCode)}
                        className="px-2.5 py-1 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#d4b8ff] hover:bg-primary/20 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                        title={showCode ? "Hide connection code" : "Show connection code"}
                      >
                        {showCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showCode ? "Hide" : "Show"}</span>
                      </button>
                    </div>

                    <h3 className="font-serif font-bold text-3xl text-[#18003d] dark:text-[#eee6ff] mb-2 tracking-wider">
                      {showCode ? displayPairingCode : '••••••••'}
                    </h3>

                    <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] leading-relaxed font-medium">
                      Share this code with your partner. When they log in with this code, they can view your expected cycle periods, energy, and cravings.
                    </p>
                  </div>

                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-3 text-xs italic text-primary dark:text-[#d4b8ff] mt-4 font-medium flex items-center justify-between">
                    <span>Strict privacy: You choose what gets shared inside settings.</span>
                  </div>
                </div>

                {/* Status Card */}
                <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-6 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex flex-col justify-between min-h-[220px] relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                  <div>
                    <span className="text-[10px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block mb-1">
                      Connection Status
                    </span>
                    <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff] mb-3 flex items-center gap-2">
                      {isConnected ? (
                        <>Partner Linked <Heart className="w-5 h-5 text-red-500 fill-current inline" /></>
                      ) : (
                        'No Partner Linked'
                      )}
                    </h3>

                    {isConnected ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-[#3d3050] dark:text-[#c8bedd] flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-primary" /> Connected Partner
                          </span>
                          <span className="font-bold text-[#18003d] dark:text-[#eee6ff] bg-primary/10 px-2.5 py-0.5 rounded-full">
                            {connectedPartnerName} {user?.connectedPartner?.email ? `(${user.connectedPartner.email})` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-[#3d3050] dark:text-[#c8bedd]">Last Update Sync</span>
                          <span className="font-bold text-primary dark:text-[#d4b8ff]">Just now</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium leading-relaxed">
                        No active partner linked to your account yet. Share your connection code with your partner so they can log in.
                      </p>
                    )}

                    {regenMsg && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                        {regenMsg}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    {isConnected && (
                      <button 
                        onClick={() => router.push('/partner?tab=chat')}
                        className="flex-1 py-2.5 rounded-xl border border-primary/30 dark:border-primary/40 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary dark:text-[#d4b8ff] transition-all cursor-pointer"
                      >
                        Send Love Note
                      </button>
                    )}

                    <button 
                      onClick={handleRegenerateCode}
                      disabled={regenLoading}
                      className="flex-1 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {regenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Regenerate Code
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              // PARTNER'S DASHBOARD VIEW
              <div className="flex flex-col gap-6">
                
                {/* Status cards */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
                  
                  {/* Tracked User's Cycle Stage */}
                  <div className="md:col-span-8 glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px] border border-white/50 dark:border-[#3a2d58]/60 shadow-sm">
                    <div className="absolute top-4 right-4 opacity-15 pointer-events-none text-primary">
                      <Heart className="w-14 h-14 fill-current" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 mb-4">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="font-bold text-[10px] text-primary dark:text-[#d4b8ff] uppercase tracking-wider">
                          {dashboardData?.cycleMetrics?.currentPhase || 'Luteal Phase'}
                        </span>
                      </div>
                      <h2 className="font-serif font-bold text-4xl text-primary dark:text-[#d4b8ff] mb-1">
                        Day {dashboardData?.cycleMetrics?.currentDay || 24}
                      </h2>
                      <p className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">
                        Period Expected in {dashboardData?.cycleMetrics?.daysLeft || 4} days
                      </p>
                    </div>
                    <div className="mt-6 text-xs text-[#3d3050] dark:text-[#c8bedd] font-semibold">
                      {dashboardData?.cycleMetrics?.updatedText || 'Updated just now'}
                    </div>
                  </div>

                  {/* Cravings & Energy summary */}
                  <div className="md:col-span-4 flex flex-col gap-4">
                    {/* Energy */}
                    <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shrink-0">
                        <Heart className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block mb-0.5">Energy Level</span>
                        <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">
                          {dashboardData?.cycleMetrics?.energyLevel || 'Low Energy'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Cravings */}
                    <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary border border-tertiary/20 shrink-0 text-lg">
                        🌸
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block mb-0.5">Cravings</span>
                        <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">
                          {dashboardData?.cycleMetrics?.cravings || 'Chocolate'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* AI Advice widget */}
                <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-6 md:p-8 ai-glow relative overflow-hidden border border-white/50 dark:border-[#3a2d58]/60 shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/20 rounded-full blur-3xl"></div>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shadow-inner z-10 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="z-10">
                      <h3 className="font-serif font-bold text-xl text-[#18003d] dark:text-[#eee6ff]">Nyra AI Suggests</h3>
                      <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-semibold">How you can support {trackedUserName} today</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 z-10 relative">
                    {(dashboardData?.suggestions || [
                      { title: 'Offer a quiet evening', desc: 'Her low energy suggests she might appreciate resting instead of going out.' },
                      { title: 'Bring a small treat', desc: 'She logged cravings for chocolate. A small surprise will mean a lot!' },
                    ]).map((s: any, idx: number) => (
                      <div key={idx} className="bg-white/60 dark:bg-[#1c1230]/70 border border-white/50 dark:border-[#3a2d58]/60 p-4 rounded-2xl space-y-1">
                        <h4 className="font-bold text-xs text-[#18003d] dark:text-[#eee6ff]">{s.title}</h4>
                        <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] leading-relaxed font-medium">
                          {s.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </motion.div>
        )}

        {/* ── 2. DEDICATED PARTNER CHAT VIEW ── */}
        {activeTab === 'chat' && (
          <motion.div 
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-0 right-0 bottom-0 bg-white dark:bg-[#120b24] z-40 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="flex justify-between items-center bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md px-4 py-3 border-b border-black/8 dark:border-[#3a2d58]/60">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push('/partner')}
                  className="p-2 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-colors text-[#3d3050] dark:text-[#c8bedd]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm shrink-0">
                    <img 
                      src={chatPartnerInfo?.avatar_url || user?.connectedPartner?.avatarUrl || (isPartner 
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                        : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80")}
                      alt="Chat Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c1230]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">{chatPartnerInfo?.name || connectedPartnerName} ❤️</h3>
                  <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1 block mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online • Active Now
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowClearModal(true)}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-400 dark:text-red-400"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body Logs */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain p-4 pb-2 flex flex-col gap-3 bg-white dark:bg-[#0d0818] relative"
              onClick={() => { setContextMenu(null); setActiveMessageIdForReactions(null); }}
            >
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">❤️</div>
                  <div>
                    <p className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">Start the conversation</p>
                    <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] mt-1">Send a message to {connectedPartnerName}</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => {
                const isSentByMe = isMsgSentByMe(msg);
                const isReactionsActive = activeMessageIdForReactions === msg.id;
                const mediaUrl = msg.mediaUrl || msg.media_url;
                const mediaType = msg.mediaType || msg.media_type;

                return (
                  <div 
                    key={msg.id}
                    className={`flex w-full ${isSentByMe ? 'justify-end' : 'justify-start'} relative`}
                    onContextMenu={(e) => { e.preventDefault(); openContextMenu(e, msg.id); }}
                    onTouchStart={(e) => {
                      longPressTimer.current = setTimeout(() => openContextMenu(e, msg.id), 500);
                    }}
                    onTouchMove={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                    onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                  >
                    <div className={`relative max-w-[78%] ${isSentByMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      {/* Image/Video with download button */}
                      {mediaUrl && (mediaType === 'image') && (
                        <div className="relative group/media rounded-2xl overflow-hidden shadow-sm border border-black/10 mb-1">
                          <img
                            src={mediaUrl}
                            alt="Attachment"
                            className="max-h-64 max-w-full object-cover block"
                          />
                          <a
                            href={mediaUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded-xl opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold"
                          >
                            <FileText className="w-3 h-3" /> Save
                          </a>
                        </div>
                      )}
                      {mediaUrl && (mediaType === 'video') && (
                        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-black/10 mb-1">
                          <video src={mediaUrl} controls className="max-h-64 max-w-full block" />
                        </div>
                      )}
                      {mediaUrl && (mediaType !== 'image' && mediaType !== 'video') && (
                        <a
                          href={mediaUrl}
                          download="attachment"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-2 p-3 rounded-2xl font-bold text-xs border mb-1 ${
                            isSentByMe ? 'bg-primary/80 text-white border-primary/20' : 'bg-white dark:bg-[#1c1230] text-primary border-black/10 dark:border-[#3a2d58]'
                          }`}
                        >
                          <FileText className="w-4 h-4" /> Download Attachment
                        </a>
                      )}

                      {/* Text message bubble */}
                      {(msg.text || msg.sticker) && (
                        <div
                          onDoubleClick={() => setActiveMessageIdForReactions(msg.id)}
                          className={`rounded-2xl px-3.5 py-2.5 text-[13px] font-medium leading-relaxed relative select-text ${
                            isSentByMe
                              ? 'bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm shadow-md'
                              : 'bg-white dark:bg-[#1e1535] text-[#18003d] dark:text-[#eee6ff] rounded-bl-sm shadow-sm border border-black/6 dark:border-[#3a2d58]/60'
                          }`}
                        >
                          {msg.sticker ? (
                            <div className="text-center py-1">
                              <span className="text-4xl filter drop-shadow block mb-1">
                                {mockStickers.find((s) => s.label === msg.sticker)?.emoji || '🌸'}
                              </span>
                              <span className={`text-[10px] font-bold ${isSentByMe ? 'text-white/80' : 'text-[#3d3050] dark:text-[#c8bedd]'}`}>
                                {msg.sticker}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span>{msg.text}</span>
                              {msg.is_edited && <span className="ml-1.5 text-[9px] opacity-50 italic">edited</span>}
                            </div>
                          )}

                          {/* Timestamp & Ticks */}
                          <div className={`flex items-center gap-1 justify-end mt-1 text-[9px] ${isSentByMe ? 'text-white/80' : 'text-gray-400'}`}>
                            <span>
                              {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Just now'}
                            </span>
                            {isSentByMe && (
                              msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-300 inline" />
                              ) : msg.id.startsWith('msg-') ? (
                                <Check className="w-3.5 h-3.5 text-white/60 inline" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-white/80 inline" />
                              )
                            )}
                          </div>

                          {/* Reaction badge */}
                          {msg.reaction && (
                            <div className={`absolute -bottom-2.5 ${isSentByMe ? '-left-1' : '-right-1'} bg-white dark:bg-[#1e1535] text-sm px-1.5 py-0.5 rounded-full border border-black/8 dark:border-[#3a2d58] shadow-md`}>
                              {msg.reaction}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Reaction Bar — shows on double-tap */}
                      <AnimatePresence>
                        {isReactionsActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 4 }}
                            className={`absolute -top-11 ${isSentByMe ? 'right-0' : 'left-0'} bg-white dark:bg-[#1e1535] border border-black/8 dark:border-[#3a2d58] rounded-2xl px-2 py-1.5 shadow-xl flex gap-2 z-30`}
                          >
                            {mockReactions.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); handleReactionClick(msg.id, emoji); setActiveMessageIdForReactions(null); }}
                                className="text-xl hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />

              {/* Context Menu (Telegram-style) — rendered in fixed position */}
              <AnimatePresence>
                {contextMenu && (() => {
                  const msg = messages.find((m) => m.id === contextMenu.msgId);
                  const isMine = msg && isMsgSentByMe(msg);
                  return (
                    <motion.div
                      ref={contextMenuRef}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{
                        position: 'fixed',
                        top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220),
                        left: Math.min(Math.max(contextMenu.x - 80, 8), (typeof window !== 'undefined' ? window.innerWidth : 400) - 180),
                        zIndex: 9999,
                      }}
                      className="bg-white dark:bg-[#1e1535] border border-black/10 dark:border-[#3a2d58] rounded-2xl shadow-2xl overflow-hidden min-w-[170px] py-1"
                    >
                      {/* Quick Reactions Row */}
                      <div className="px-3 py-2.5 border-b border-black/5 dark:border-[#3a2d58]/60">
                        <div className="flex gap-2 justify-around">
                          {mockReactions.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => { handleReactionClick(contextMenu.msgId, emoji); setContextMenu(null); }}
                              className="text-xl hover:scale-125 transition-transform active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Copy */}
                      {msg?.text && (
                        <button
                          onClick={() => copyMessage(msg.text)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left hover:bg-black/5 dark:hover:bg-white/5 text-[#18003d] dark:text-[#eee6ff] transition-colors"
                        >
                          <Copy className="w-4 h-4 text-gray-400" /> Copy
                        </button>
                      )}

                      {/* Edit */}
                      {isMine && msg?.text && (
                        <button
                          onClick={() => startEditMessage(msg)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left hover:bg-black/5 dark:hover:bg-white/5 text-[#18003d] dark:text-[#eee6ff] transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-gray-400" /> Edit
                        </button>
                      )}

                      {/* Download if has media */}
                      {(msg?.mediaUrl || msg?.media_url) && (
                        <a
                          href={msg.mediaUrl || msg.media_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setContextMenu(null)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left hover:bg-black/5 dark:hover:bg-white/5 text-[#18003d] dark:text-[#eee6ff] transition-colors"
                        >
                          <FileText className="w-4 h-4 text-gray-400" /> Download
                        </a>
                      )}

                      {/* Delete */}
                      {isMine && (
                        <button
                          onClick={() => handleDeleteMessage(contextMenu.msgId)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors border-t border-black/5 dark:border-[#3a2d58]/60 mt-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Edit Mode Bar */}
            <AnimatePresence>
              {editingMsgId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-primary/10 dark:bg-primary/20 border-t border-primary/30 px-4 py-2 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-primary">Editing message</span>
                  <button onClick={() => { setEditingMsgId(null); setEditText(''); }} className="ml-auto p-1 rounded-lg hover:bg-primary/10">
                    <X className="w-3.5 h-3.5 text-primary" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticker & Emoji Drawer */}
            <AnimatePresence>
              {showStickerDrawer && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="bg-white/95 dark:bg-[#16102a]/95 border-t border-black/8 dark:border-[#3a2d58]/60 overflow-hidden flex flex-col z-20 shadow-inner"
                >
                  <div className="flex justify-between items-center px-4 py-2 border-b border-black/8 dark:border-[#3a2d58]/40">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDrawerTab('emojis')}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                          drawerTab === 'emojis' ? 'bg-primary text-white' : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        😊 Emojis
                      </button>
                      <button
                        onClick={() => setDrawerTab('stickers')}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                          drawerTab === 'stickers' ? 'bg-primary text-white' : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        🌸 Stickers
                      </button>
                    </div>
                    <button onClick={() => setShowStickerDrawer(false)} className="text-xs text-primary dark:text-[#d4b8ff] font-bold">Close</button>
                  </div>

                  {drawerTab === 'emojis' ? (
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 p-4">
                      {quickEmojis.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => handleEmojiClick(emoji)}
                          className="p-3 text-2xl hover:scale-125 transition-transform active:scale-95 bg-white/40 dark:bg-[#1c1230]/60 rounded-xl border border-black/5 dark:border-[#3a2d58]/60"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3 p-4">
                      {mockStickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          onClick={() => handleSendSticker(sticker.label)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-black/8 dark:border-[#3a2d58]/60 bg-white/40 dark:bg-[#1c1230]/60 hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary active:scale-95 transition-all"
                        >
                          <span className="text-3xl filter drop-shadow-sm">{sticker.emoji}</span>
                          <span className="text-[9px] font-bold text-[#3d3050] dark:text-[#c8bedd] mt-1.5">{sticker.label.split(' ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Footer Input Box */}
            <div className="bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md px-4 py-3 border-t border-black/8 dark:border-[#3a2d58]/60 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,application/pdf,application/msword,.doc,.docx,.txt"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-2xl text-[#3d3050] dark:text-[#c8bedd] hover:bg-primary/10 transition-colors"
                title="Attach Image, Video, or Document"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowStickerDrawer(!showStickerDrawer)}
                className={`p-2 rounded-2xl transition-colors ${
                  showStickerDrawer ? 'text-primary bg-primary/10' : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-primary/10'
                }`}
                title="Emojis & Stickers"
              >
                <Smile className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                placeholder={editingMsgId ? 'Edit message...' : `Message ${connectedPartnerName}...`}
                value={editingMsgId ? editText : chatInput}
                onChange={(e) => editingMsgId ? setEditText(e.target.value) : setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') editingMsgId ? handleSaveEdit() : handleSendMessage();
                  if (e.key === 'Escape' && editingMsgId) { setEditingMsgId(null); setEditText(''); }
                }}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-outline-variant/60 dark:border-[#3a2d58] focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-xs font-semibold bg-white/80 dark:bg-[#16102a] text-[#18003d] dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
              />
              <button 
                onClick={editingMsgId ? handleSaveEdit : handleSendMessage}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20 active:scale-95 hover:opacity-95"
              >
                {editingMsgId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

          </motion.div>
        )}

        {/* Clear Chat Modal */}
        <AnimatePresence>
          {showClearModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              onClick={() => setShowClearModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#1c1230] rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-black/5 dark:border-[#3a2d58]"
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#18003d] dark:text-[#eee6ff] mb-1">Clear Chat</h3>
                    <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium">Choose what to clear from this conversation.</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => handleClearChat(true)}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Clear Only My Messages
                    </button>
                    <button
                      onClick={() => handleClearChat(false)}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Clear Entire Chat (Both Sides)
                    </button>
                    <button
                      onClick={() => setShowClearModal(false)}
                      className="w-full py-2 rounded-2xl text-xs font-semibold text-[#3d3050] dark:text-[#c8bedd] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 3. DEDICATED PARTNER AI CHAT VIEW (WITH MULTI-THREAD & PROMPT-TO-PROMPT SCROLL) ── */}
        {activeTab === 'ai' && (
          <motion.div 
            key="ai-support"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card bg-white/80 dark:bg-[#16102a]/95 rounded-3xl border border-white/60 dark:border-[#3a2d58]/60 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[480px] relative"
          >
            {/* AI Header with Thread Menu & Prompt Index Buttons */}
            <div className="flex justify-between items-center bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md px-4 py-3 border-b border-black/8 dark:border-[#3a2d58]/60">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAiThreadsDrawer(!showAiThreadsDrawer)}
                  className="p-2 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-colors text-[#3d3050] dark:text-[#c8bedd]"
                  title="Multiple Chat Threads"
                >
                  <Menu className="w-5 h-5 text-tertiary" />
                </button>
                <div className="w-9 h-9 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#18003d] dark:text-[#eee6ff] truncate max-w-[180px] sm:max-w-[280px]">
                    {activePartnerAiThread?.title || 'Partner AI Support'}
                  </h3>
                  <span className="text-[10px] font-bold text-tertiary block mt-0.5">Specialized Cycle Advice for Partners</span>
                </div>
              </div>

              {/* Right actions: Prompt Outline Index + New Chat */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAiOutline(!showAiOutline)}
                  title="Prompt-to-Prompt Index"
                  className={`p-2 rounded-xl transition-colors ${
                    showAiOutline ? 'bg-tertiary text-white' : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-tertiary/10'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCreateNewAiChat}
                  title="Create New Partner Chat Thread"
                  className="px-3 py-1.5 rounded-xl bg-tertiary/10 text-tertiary hover:bg-tertiary/20 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Chat</span>
                </button>
              </div>
            </div>

            {/* Quick Prompt Suggestions Bar */}
            <div className="px-4 py-2 bg-white/40 dark:bg-[#100c20]/60 border-b border-black/8 dark:border-[#3a2d58]/40 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button 
                onClick={() => handleSendPartnerAi(`How can I support ${trackedUserName} during her Luteal Phase?`)}
                className="px-3 py-1 rounded-xl border border-tertiary/30 bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-[11px] font-semibold shrink-0 transition-colors"
              >
                🌸 Support Luteal phase?
              </button>
              <button 
                onClick={() => handleSendPartnerAi("What foods ease her cramps?")}
                className="px-3 py-1 rounded-xl border border-tertiary/30 bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-[11px] font-semibold shrink-0 transition-colors"
              >
                🍫 Foods for cramps?
              </button>
              <button 
                onClick={() => handleSendPartnerAi("How to comfort her when energy is low?")}
                className="px-3 py-1 rounded-xl border border-tertiary/30 bg-tertiary/5 dark:bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-[11px] font-semibold shrink-0 transition-colors"
              >
                ✨ Comfort low energy?
              </button>
            </div>

            {/* AI Chat Messages Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 bg-white/30 dark:bg-[#0d0818]/60 relative">
              {partnerAiMessages.map((msg) => {
                const isUser = msg.senderId === user?.id || msg.senderId === 'partner-john' || msg.senderId === 'user';
                const isSpeaking = speakingMessageId === msg.id;

                return (
                  <div 
                    key={msg.id} 
                    ref={(el) => { messageRefs.current[msg.id] = el; }}
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs font-medium leading-relaxed border shadow-sm relative ${
                      isUser 
                        ? 'bg-gradient-to-r from-primary to-secondary text-white border-primary/20 rounded-tr-sm' 
                        : 'glass-card bg-white/90 dark:bg-[#1c1230]/90 text-[#18003d] dark:text-[#eee6ff] border-white/60 dark:border-[#3a2d58]/60 rounded-tl-sm'
                    }`}>
                      {!isUser && (
                        <div className="flex items-center justify-between gap-2 mb-1.5 text-tertiary font-bold text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5" />
                            <span>Nyra Partner AI</span>
                          </div>
                          
                          {/* Audio Speak & Copy Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSpeakText(msg.text, msg.id)}
                              className={`p-1 rounded hover:bg-tertiary/10 transition-colors ${
                                isSpeaking ? 'text-primary animate-pulse' : 'text-[#3d3050] dark:text-[#c8bedd]'
                              }`}
                              title="Listen aloud"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="p-1 rounded text-[#3d3050] dark:text-[#c8bedd] hover:bg-tertiary/10 transition-colors"
                              title="Copy text"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={aiChatEndRef} />
            </div>

            {/* AI Input Footer */}
            <div className="bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md px-4 py-3 border-t border-black/8 dark:border-[#3a2d58]/60 flex items-center gap-2">
              <input 
                type="text" 
                placeholder={`Ask Nyra AI how to support ${trackedUserName}...`}
                value={partnerAiInput}
                onChange={(e) => setPartnerAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPartnerAi()}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-outline-variant/60 dark:border-[#3a2d58] focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 outline-none text-xs font-semibold bg-white/80 dark:bg-[#16102a] text-[#18003d] dark:text-[#eee6ff] dark:placeholder-[#8a7fa0]"
              />
              <button 
                onClick={() => handleSendPartnerAi()}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-tertiary to-primary text-white shadow-md active:scale-95 hover:opacity-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* ── DRAWER 1: MULTIPLE CHAT THREADS SLIDE-OUT ── */}
            <AnimatePresence>
              {showAiThreadsDrawer && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-y-0 left-0 w-80 bg-white/95 dark:bg-[#16102a]/95 backdrop-blur-2xl border-r border-black/8 dark:border-[#3a2d58]/60 shadow-2xl z-40 flex flex-col p-4"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-black/8 dark:border-[#3a2d58]/40">
                    <h3 className="font-serif font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">Partner AI Threads</h3>
                    <button onClick={() => setShowAiThreadsDrawer(false)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-[#3d3050] dark:text-[#c8bedd]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={handleCreateNewAiChat}
                    className="w-full mt-4 py-2.5 px-4 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-bold text-xs rounded-2xl border border-tertiary/20 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Start New Partner Chat
                  </button>

                  {/* Thread list */}
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 my-4">
                    {partnerAiThreads.map((thread) => {
                      const isActive = thread.id === activePartnerAiThreadId;
                      const isEditing = editingThreadId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            setActivePartnerAiThreadId(thread.id);
                            setShowAiThreadsDrawer(false);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                            isActive
                              ? 'bg-tertiary/15 border-tertiary/40 shadow-sm'
                              : 'bg-white/40 dark:bg-[#1c1230]/40 border-black/8 dark:border-[#3a2d58]/40 hover:bg-white/80 dark:hover:bg-[#1c1230]'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="flex-1 px-2 py-1 text-xs font-bold rounded-xl border border-tertiary bg-white dark:bg-[#100c20] text-[#18003d] dark:text-[#eee6ff]"
                                autoFocus
                              />
                              <button onClick={() => handleSaveRename(thread.id)} className="p-1 text-tertiary hover:bg-tertiary/10 rounded-lg">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-xs text-[#18003d] dark:text-[#eee6ff] truncate">{thread.title}</span>
                                <span className="text-[10px] text-[#3d3050] dark:text-[#c8bedd] truncate mt-0.5">
                                  {thread.messages.length} messages
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => handleStartRename(thread.id, thread.title, e)} className="p-1 text-[#3d3050] dark:text-[#c8bedd] hover:text-tertiary">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {partnerAiThreads.length > 1 && (
                                  <button onClick={(e) => handleDeleteAiThread(thread.id, e)} className="p-1 text-[#3d3050] dark:text-[#c8bedd] hover:text-error">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── DRAWER 2: PROMPT-TO-PROMPT SCROLL INDEX SLIDE-OUT ── */}
            <AnimatePresence>
              {showAiOutline && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-y-0 right-0 w-80 bg-white/95 dark:bg-[#16102a]/95 backdrop-blur-2xl border-l border-black/8 dark:border-[#3a2d58]/60 shadow-2xl z-40 flex flex-col p-4"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-black/8 dark:border-[#3a2d58]/40">
                    <h3 className="font-serif font-bold text-lg text-[#18003d] dark:text-[#eee6ff]">Prompt-to-Prompt Index</h3>
                    <button onClick={() => setShowAiOutline(false)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-[#3d3050] dark:text-[#c8bedd]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] font-medium mt-3 mb-4">
                    Click any prompt below to smooth-scroll directly to that question in the thread:
                  </p>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                    {userPrompts.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => scrollToMessage(p.id)}
                        className="w-full text-left p-3 rounded-2xl bg-white/50 dark:bg-[#1c1230]/50 border border-black/8 dark:border-[#3a2d58]/40 hover:bg-tertiary/10 hover:border-tertiary/40 transition-all flex items-start gap-2.5 text-xs font-semibold text-[#18003d] dark:text-[#eee6ff] group"
                      >
                        <span className="w-5 h-5 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0 font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="line-clamp-2 leading-relaxed flex-1">{p.text}</span>
                      </button>
                    ))}

                    {userPrompts.length === 0 && (
                      <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] italic text-center py-8">
                        No prompts asked yet in this thread.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
