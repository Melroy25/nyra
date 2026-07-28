import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { 
  Heart, Send, Smile, Info, Sparkles, MessageCircle, ArrowLeft, ArrowUp, PlusCircle, Check, CheckCheck, HelpCircle, Bot,
  Menu, ListFilter, Plus, Edit3, Trash2, Volume2, Copy, X, KeyRound, Loader2,
  Eye, EyeOff, RefreshCw, UserCheck, Unlink, Paperclip, FileText, MoreVertical, ChevronDown, Bell, BellOff, Reply, Sun, Moon
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
    darkMode,
    toggleDarkMode,
    unreadCount,
    setUnreadCount,
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

  const [messages, setMessages] = useState<any[]>([]);

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPartnerAiImage, setSelectedPartnerAiImage] = useState<string | null>(null);
  const aiImageInputRef = useRef<HTMLInputElement>(null);
  const [drawerTab, setDrawerTab] = useState<'emojis' | 'stickers'>('emojis');

  // ── Voice Note ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Per-message playback speed: msgId -> speed
  const [voicePlaybackRate, setVoicePlaybackRate] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [voicePlaying, setVoicePlaying] = useState<Record<string, boolean>>({});
  const [voiceProgress, setVoiceProgress] = useState<Record<string, number>>({}); // 0-1
  const [voiceDuration, setVoiceDuration] = useState<Record<string, number>>({}); // total seconds
  const [voiceCurrentTime, setVoiceCurrentTime] = useState<Record<string, number>>({}); // elapsed seconds

  // ── Telegram-like message features ──────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [undoToast, setUndoToast] = useState<{ label: string; onUndo: () => void; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [chatPartnerInfo, setChatPartnerInfo] = useState<any>(() => user?.connectedPartner || null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(true);
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        try {
          new Notification('Nyra Notifications Enabled 🔔', {
            body: 'You will now receive instant alerts when your partner messages you!',
            icon: '/logo.png',
          });
        } catch (e) {}
      }
    }
  };

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

  const handleDeleteMessage = (msgId: string) => {
    setContextMenu(null);
    // Optimistically hide the message
    const deletedMsg = messages.find((m) => m.id === msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    // Clear any existing undo toast
    if (undoToast) clearTimeout(undoToast.timeoutId);

    // 5-second countdown before actual deletion
    const timeoutId = setTimeout(async () => {
      setUndoToast(null);
      try { await apiDeleteMessage(msgId); } catch (err) { console.log('Delete fallback:', err); }
    }, 5000);

    setUndoToast({
      label: 'Message deleted',
      onUndo: () => {
        clearTimeout(timeoutId);
        setUndoToast(null);
        // Restore the deleted message
        if (deletedMsg) {
          setMessages((prev) => {
            const already = prev.some((m) => m.id === msgId);
            if (already) return prev;
            return [...prev, deletedMsg].sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      },
      timeoutId,
    });
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

    const prevMessages = [...messages];
    if (clearForMe) {
      setMessages((prev) => prev.filter((m) => !(m.senderId === user?.id || (isPartner && m.senderId === 'partner-john') || (!isPartner && m.senderId === 'user-sarah'))));
    } else {
      setMessages([]);
    }

    if (undoToast) clearTimeout(undoToast.timeoutId);

    const label = clearForMe ? 'Your messages cleared' : 'Entire chat cleared';
    const timeoutId = setTimeout(async () => {
      setUndoToast(null);
      try { await apiClearChat(chatThreadId, clearForMe); } catch (err) { console.log('Clear chat fallback:', err); }
    }, 5000);

    setUndoToast({
      label,
      onUndo: () => {
        clearTimeout(timeoutId);
        setUndoToast(null);
        setMessages(prevMessages);
      },
      timeoutId,
    });
  };

  const copyMessage = (text: string) => {
    setContextMenu(null);
    if (text) navigator.clipboard.writeText(text).catch(() => {});
  };

  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Dynamic user & partner details — user is restored from cache by _app.tsx on mount
  const isPartner = user?.role === 'partner';
  const myName = user?.name || 'User';
  const connectedPartnerName = user?.connectedPartner?.name || chatPartnerInfo?.name || 'Partner';
  const trackedUserName = isPartner ? connectedPartnerName : myName;
  const [dashboardData, setDashboardData] = useState<any>(null);
  const isConnected = Boolean(user?.connectedPartnerId || user?.connectedPartner);
  const displayPairingCode = user?.connectedPartner?.partnerCode || (user?.connectedPartner as any)?.partner_code || dashboardData?.partner?.partner_code || user?.partnerCode || '';
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

    // Clear unread badge whenever user opens the chat tab
    if (activeTab === 'chat') {
      setUnreadCount(0);
    }
  }, [activeTab]);

  // System Notification Sender — uses SW for mobile PWA compatibility
  const triggerNotification = async (msg: any, partnerName: string, avatarUrl?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Request permission if not yet set
    if (Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission !== 'granted') return;

    const bodyText = msg.text || (msg.sticker ? `Sent a sticker: ${msg.sticker}` : 'Sent an attachment 📎');
    const notifOptions: NotificationOptions = {
      body: bodyText,
      icon: avatarUrl || '/logo.png',
      badge: '/logo.png',
      tag: `chat-${msg.id}`,
    };

    // Use Service Worker (required on mobile PWA / Android)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg?.showNotification) {
          await reg.showNotification(`${partnerName} ❤️`, notifOptions);
          return;
        }
      } catch (e) {}
    }

    // Fallback to browser notification (desktop only)
    try {
      new Notification(`${partnerName} ❤️`, notifOptions);
    } catch (e) {}
  };

  // Track the authenticated user's real ID from API responses for correct alignment
  const [authUserId, setAuthUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('nyra_cached_user') || '{}')?.id || null; } catch { return null; }
    }
    return null;
  });

  // Clear messages when leaving chat tab to avoid showing stale data on re-entry
  useEffect(() => {
    if (activeTab !== 'chat') {
      setMessages([]);
      setIsChatLoading(true);
    }
  }, [activeTab]);

  // ── Live message polling ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'chat') return;

    let isActiveView = true; // Track if this effect is still mounted

    const fetchLiveMessages = (opts: { markRead?: boolean; heartbeat?: boolean } = {}) => {
      apiGetMessages('auto', opts)
        .then(({ messages: liveMsgs, threadId, partnerInfo, myUserId }) => {
          if (!isActiveView) return;
          if (threadId) setChatThreadId(threadId);
          // Capture real authenticated user ID from server response for correct bubble alignment
          if (myUserId) {
            setAuthUserId(myUserId);
            try {
              const cached = JSON.parse(localStorage.getItem('nyra_cached_user') || '{}');
              if (cached.id !== myUserId) {
                localStorage.setItem('nyra_cached_user', JSON.stringify({ ...cached, id: myUserId }));
              }
            } catch {}
          }
          if (partnerInfo) {
            setChatPartnerInfo((prev: any) =>
              prev?.id === partnerInfo.id &&
              prev?.name === partnerInfo.name &&
              prev?.avatar_url === partnerInfo.avatar_url &&
              prev?.updated_at === partnerInfo.updated_at
                ? prev
                : partnerInfo
            );
          }
          if (liveMsgs) {
            setMessages(() => {
              const formatted = liveMsgs.map((m: any) => ({
                id: m.id,
                senderId: m.sender_id,
                text: m.text,
                sticker: m.sticker,
                reaction: m.reaction,
                mediaUrl: m.media_url,
                mediaType: m.media_type,
                timestamp: m.created_at,
                is_read: m.is_read,
                is_edited: m.is_edited,
                replyTo: m.reply_to || m.replyTo,
              }));
              return formatted;
            });
          }
          setIsChatLoading(false);
        })
        .catch(() => {
          if (isActiveView) setIsChatLoading(false);
        });
    };

    // First fetch: mark as read + heartbeat (user just opened chat)
    fetchLiveMessages({ markRead: true, heartbeat: true });

    // Poll every 3s — regular poll (no markRead/heartbeat, those happen separately)
    const interval = setInterval(() => fetchLiveMessages(), 3000);

    // Heartbeat every 30s to update presence (keeps user "Online" while actively in chat)
    const heartbeatInterval = setInterval(() => {
      fetchLiveMessages({ markRead: true, heartbeat: true });
    }, 30000);

    return () => {
      isActiveView = false;
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [activeTab]);

  // Auto-scroll chat to bottom ONLY when message count changes or switching tab
  const prevMsgLengthRef = useRef(messages.length);
  useEffect(() => {
    if (activeTab === 'chat') {
      if (messages.length > prevMsgLengthRef.current || prevMsgLengthRef.current === 0) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      prevMsgLengthRef.current = messages.length;
    } else if (activeTab === 'ai') {
      aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, partnerAiMessages.length, activeTab]);

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

  const handleStartReply = (msg: any) => {
    const senderName = isMsgSentByMe(msg) ? 'You' : (chatPartnerInfo?.name || connectedPartnerName || 'Partner');
    setReplyingToMessage({
      id: msg.id,
      senderName,
      text: msg.text || (msg.sticker ? `Sticker: ${msg.sticker}` : (msg.mediaUrl || msg.media_url ? 'Attachment 📎' : '')),
    });
    setContextMenu(null);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const textToSend = chatInput.trim();
    const activeReply = replyingToMessage;
    setChatInput('');
    setReplyingToMessage(null);

    const tempId = `msg-${Date.now()}`;
    const myId = user?.id || (isPartner ? 'partner' : 'user');

    const replyPayload = activeReply ? {
      id: activeReply.id,
      senderName: activeReply.senderName,
      text: activeReply.text,
    } : undefined;

    // Add locally immediately so chat is instant and linked
    const newMsg = {
      id: tempId,
      senderId: myId,
      text: textToSend,
      timestamp: new Date().toISOString(),
      replyTo: replyPayload,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Sync with Zustand store
    addMessage(textToSend);

    // Call backend API
    try {
      const { message: sentMsg } = await apiSendMessage('auto', textToSend, undefined, undefined, undefined, replyPayload);
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
                  replyTo: sentMsg.reply_to || replyPayload,
                }
              : m
          )
        );
        // Update authUserId from sent message if not already set
        if (!authUserId && sentMsg.sender_id) {
          setAuthUserId(sentMsg.sender_id);
        }
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

  const handleReactionClick = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m
      )
    );
    setActiveMessageIdForReactions(null);

    try {
      await apiAddReaction(messageId, emoji);
    } catch (err) {
      console.error('Reaction sync error:', err);
    }
  };

  // ── Voice Note Handlers ──────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        setVoiceBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    setVoiceBlob(null);
    audioChunksRef.current = [];
  };

  const sendVoiceNote = async () => {
    if (!voiceBlob) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const tempId = `msg-${Date.now()}`;
      const myId = authUserId || user?.id || 'user';
      const newMsg = { id: tempId, senderId: myId, text: '', mediaUrl: dataUrl, mediaType: 'audio', timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, newMsg]);
      setVoiceBlob(null);
      try {
        const { message: sentMsg } = await apiSendMessage('auto', undefined, undefined, dataUrl, 'audio');
        if (sentMsg) {
          setMessages(prev => prev.map(m => m.id === tempId ? {
            id: sentMsg.id, senderId: sentMsg.sender_id, text: '', mediaUrl: sentMsg.media_url, mediaType: 'audio', timestamp: sentMsg.created_at
          } : m));
        }
      } catch (err) { console.log('Voice note upload fallback:', err); }
    };
    reader.readAsDataURL(voiceBlob);
  };

  const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const toggleVoicePlay = (msgId: string, url: string) => {
    const audio = audioRefs.current[msgId];
    if (!audio) return;
    if (voicePlaying[msgId]) {
      audio.pause();
      setVoicePlaying(prev => ({ ...prev, [msgId]: false }));
    } else {
      audio.playbackRate = voicePlaybackRate[msgId] || 1;
      audio.play();
      setVoicePlaying(prev => ({ ...prev, [msgId]: true }));
    }
  };

  const cyclePlaybackRate = (msgId: string) => {
    const current = voicePlaybackRate[msgId] || 1;
    const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1;
    setVoicePlaybackRate(prev => ({ ...prev, [msgId]: next }));
    const audio = audioRefs.current[msgId];
    if (audio) audio.playbackRate = next;
  };

  // Handle Partner AI Chat query (real API call)
  const [isPartnerAiTyping, setIsPartnerAiTyping] = useState(false);
  const handlePartnerAiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPartnerAiImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendPartnerAi = async (promptText?: string) => {
    const textToSend = promptText || partnerAiInput || (selectedPartnerAiImage ? 'Analyzed attached image.' : '');
    const attachedImg = selectedPartnerAiImage;
    if ((!textToSend.trim() && !attachedImg) || isPartnerAiTyping) return;

    if (!promptText) setPartnerAiInput('');
    setSelectedPartnerAiImage(null);

    // Add user message (isAi = false)
    addPartnerAiMessage(textToSend.trim(), false, attachedImg || undefined);
    setIsPartnerAiTyping(true);

    try {
      const { reply } = await apiAiChat(activePartnerAiThread?.id || 'auto', textToSend.trim(), 'partner', attachedImg || undefined);
      // Add AI reply (isAi = true)
      addPartnerAiMessage(reply || 'I am here to help you support her.', true);
    } catch {
      addPartnerAiMessage('I had trouble connecting. Please check your internet and try again.', true);
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
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
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
  // Uses authUserId captured from server response (most reliable) then falls back to user store
  const isMsgSentByMe = useCallback((msg: any) => {
    if (!msg) return false;
    const sid = msg.senderId || msg.sender_id;
    if (!sid) return false;
    // Primary: use real server-confirmed user ID
    if (authUserId && sid === authUserId) return true;
    if (authUserId && sid !== authUserId) return false;
    // Fallback: use store user ID
    if (user?.id) return sid === user.id;
    return false;
  }, [authUserId, user?.id]);

  // Compute partner last active time at component scope (used in ticks + header)
  const partnerIncomingMsgsList = messages.filter((m: any) => !isMsgSentByMe(m));
  const lastPartnerMsgGlobal = partnerIncomingMsgsList[partnerIncomingMsgsList.length - 1];
  const lastPartnerActiveMs: number = lastPartnerMsgGlobal?.timestamp
    ? new Date(lastPartnerMsgGlobal.timestamp).getTime()
    : 0;

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
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                      {unreadCount}
                    </span>
                  )}
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

                  {/* Mood & Symptoms summary */}
                  <div className="md:col-span-4 flex flex-col gap-4">
                    {/* Mood */}
                    <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 text-lg ${
                        dashboardData?.cycleMetrics?.moodLogged
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                      }`}>
                        {dashboardData?.cycleMetrics?.moodLogged ? '😊' : '—'}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block mb-0.5">Mood</span>
                        {dashboardData?.cycleMetrics?.moodLogged ? (
                          <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">
                            {dashboardData.cycleMetrics.latestMood}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic font-medium">Not logged today</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Symptoms */}
                    <div className="glass-card bg-white/70 dark:bg-[#16102a]/80 rounded-2xl p-5 border border-white/50 dark:border-[#3a2d58]/60 shadow-sm flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 text-lg ${
                        dashboardData?.cycleMetrics?.symptomsLogged
                          ? 'bg-tertiary/10 text-tertiary border-tertiary/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
                      }`}>
                        {dashboardData?.cycleMetrics?.symptomsLogged ? '🌸' : '—'}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#3d3050] dark:text-[#c8bedd] uppercase tracking-wider block mb-0.5">Symptoms</span>
                        {dashboardData?.cycleMetrics?.symptomsLogged ? (
                          <span className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff] truncate max-w-[180px] block">
                            {dashboardData.cycleMetrics.symptomsText}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic font-medium">Not logged today</span>
                        )}
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
            {(() => {
              const partnerActiveTimestamp = chatPartnerInfo?.updated_at
                ? new Date(chatPartnerInfo.updated_at).getTime()
                : lastPartnerActiveMs;
              const minsAgo = partnerActiveTimestamp ? Math.floor((Date.now() - partnerActiveTimestamp) / 60000) : 9999;

              let isPartnerOnline = false;
              let partnerStatusText = 'Offline';
              if (minsAgo < 3) {
                isPartnerOnline = true;
                partnerStatusText = 'Online • Active now';
              } else if (minsAgo < 60) {
                partnerStatusText = `Last seen ${minsAgo}m ago`;
              } else if (minsAgo < 1440) {
                partnerStatusText = `Last seen ${Math.floor(minsAgo / 60)}h ago`;
              } else {
                partnerStatusText = 'Offline';
              }

              return (
                <div className="flex justify-between items-center bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md px-4 py-3 border-b border-black/8 dark:border-[#3a2d58]/60">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => router.push('/partner')}
                      className="p-2 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-colors text-[#3d3050] dark:text-[#c8bedd]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        {chatPartnerInfo?.avatar_url || user?.connectedPartner?.avatarUrl ? (
                          <img 
                            src={chatPartnerInfo?.avatar_url || user?.connectedPartner?.avatarUrl}
                            alt="Chat Avatar" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="font-bold text-xs text-primary dark:text-[#d4b8ff]">
                            {(chatPartnerInfo?.name || connectedPartnerName || 'P').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#1c1230] ${
                        isPartnerOnline ? 'bg-emerald-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">{chatPartnerInfo?.name || connectedPartnerName} ❤️</h3>
                      <span className={`text-[10px] font-bold flex items-center gap-1 block mt-0.5 ${
                        isPartnerOnline ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        {partnerStatusText}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowClearModal(true)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-400 dark:text-red-400"
                      title="Clear Chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Chat Body Logs */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain p-4 pb-2 flex flex-col gap-3 bg-white dark:bg-[#0d0818] relative"
              onClick={() => { setContextMenu(null); setActiveMessageIdForReactions(null); }}
            >
              {isChatLoading && messages.length === 0 ? (
                <div className="flex-1 flex flex-col justify-end gap-3 p-2">
                  <div className="flex justify-start">
                    <div className="w-48 h-11 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
                  </div>
                  <div className="flex justify-end">
                    <div className="w-56 h-12 bg-primary/15 rounded-2xl animate-pulse" />
                  </div>
                  <div className="flex justify-start">
                    <div className="w-40 h-10 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
                  </div>
                  <div className="flex justify-end">
                    <div className="w-64 h-14 bg-primary/15 rounded-2xl animate-pulse" />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">❤️</div>
                  <div>
                    <p className="font-bold text-sm text-[#18003d] dark:text-[#eee6ff]">Start the conversation</p>
                    <p className="text-xs text-[#3d3050] dark:text-[#c8bedd] mt-1">Send a message to {connectedPartnerName}</p>
                  </div>
                </div>
              ) : null}
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
                      {/* Voice Note bubble */}
                      {mediaUrl && mediaType === 'audio' && (() => {
                        const rate = voicePlaybackRate[msg.id] || 1;
                        const playing = voicePlaying[msg.id] || false;
                        const progress = voiceProgress[msg.id] || 0;
                        const elapsed = voiceCurrentTime[msg.id] || 0;
                        const total = voiceDuration[msg.id];
                        return (
                          <div className={`flex flex-col gap-2 px-3 pt-2.5 pb-2 rounded-2xl mb-1 ${
                            isSentByMe
                              ? 'bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white'
                              : 'bg-white dark:bg-[#1e1535] border border-black/6 dark:border-[#3a2d58]/60'
                          }`}>
                            {/* Hidden audio — preload=auto so total duration loads immediately */}
                            <audio
                              ref={el => { audioRefs.current[msg.id] = el; }}
                              src={mediaUrl}
                              preload="auto"
                              onLoadedMetadata={(e) => {
                                const el = e.currentTarget;
                                if (el.duration && isFinite(el.duration)) {
                                  setVoiceDuration(prev => ({ ...prev, [msg.id]: el.duration }));
                                }
                              }}
                              onEnded={() => {
                                setVoicePlaying(prev => ({ ...prev, [msg.id]: false }));
                                setVoiceCurrentTime(prev => ({ ...prev, [msg.id]: 0 }));
                                setVoiceProgress(prev => ({ ...prev, [msg.id]: 0 }));
                              }}
                              onTimeUpdate={(e) => {
                                const el = e.currentTarget;
                                if (el.duration && isFinite(el.duration)) {
                                  setVoiceProgress(prev => ({ ...prev, [msg.id]: el.currentTime / el.duration }));
                                  setVoiceCurrentTime(prev => ({ ...prev, [msg.id]: el.currentTime }));
                                  if (!voiceDuration[msg.id]) {
                                    setVoiceDuration(prev => ({ ...prev, [msg.id]: el.duration }));
                                  }
                                }
                              }}
                            />

                            {/* Row 1: Play + Waveform + Speed */}
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => toggleVoicePlay(msg.id, mediaUrl)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                  isSentByMe ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/10 hover:bg-primary/20'
                                } transition-colors`}
                              >
                                {playing
                                  ? <span className={`text-lg ${isSentByMe ? 'text-white' : 'text-primary'}`}>⏸</span>
                                  : <span className={`text-lg ${isSentByMe ? 'text-white' : 'text-primary'}`}>▶️</span>
                                }
                              </button>
                              <div className="flex items-center gap-px flex-1 h-8 overflow-hidden">
                                {Array.from({ length: 28 }).map((_, i) => {
                                  const barPct = i / 27;
                                  const filled = barPct <= progress;
                                  const heights = [3,5,8,6,10,12,7,9,11,5,8,14,10,7,12,9,6,11,8,13,6,10,7,9,5,11,8,6];
                                  return (
                                    <div
                                      key={i}
                                      style={{ height: `${heights[i] || 6}px`, minWidth: '2px', flex: 1 }}
                                      className={`rounded-full transition-colors ${
                                        filled
                                          ? (isSentByMe ? 'bg-white' : 'bg-primary')
                                          : (isSentByMe ? 'bg-white/40' : 'bg-primary/25')
                                      } ${playing && filled ? 'animate-pulse' : ''}`}
                                    />
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => cyclePlaybackRate(msg.id)}
                                className={`text-[10px] font-extrabold shrink-0 px-2 py-1 rounded-lg ${
                                  isSentByMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary/10 text-primary hover:bg-primary/20'
                                } transition-colors`}
                              >
                                {rate}x
                              </button>
                            </div>

                            {/* Row 2: Elapsed / Total — inside bubble, always visible */}
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold tabular-nums ${
                              isSentByMe ? 'text-white/80' : 'text-[#9d8fc0] dark:text-[#7c6aaa]'
                            }`}>
                              <span>{elapsed > 0 ? formatSeconds(Math.floor(elapsed)) : '0:00'}</span>
                              <span className="opacity-50 text-[9px]">/</span>
                              <span>{total && isFinite(total) ? formatSeconds(Math.floor(total)) : '--:--'}</span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Image with download */}
                      {mediaUrl && mediaType === 'image' && (
                        <div className="relative group/media rounded-2xl overflow-hidden shadow-sm border border-black/10 mb-1">
                          <img src={mediaUrl} alt="Attachment" className="max-h-64 max-w-full object-cover block" />
                          <a href={mediaUrl} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded-xl opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold">
                            <FileText className="w-3 h-3" /> Save
                          </a>
                        </div>
                      )}
                      {mediaUrl && mediaType === 'video' && (
                        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-black/10 mb-1">
                          <video src={mediaUrl} controls className="max-h-64 max-w-full block" />
                        </div>
                      )}
                      {mediaUrl && mediaType !== 'image' && mediaType !== 'video' && mediaType !== 'audio' && (
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
                          className={`rounded-2xl px-3.5 py-2.5 text-[13px] font-medium leading-relaxed relative select-none ${
                            isSentByMe
                              ? 'bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm shadow-md'
                              : 'bg-white dark:bg-[#1e1535] text-[#18003d] dark:text-[#eee6ff] rounded-bl-sm shadow-sm border border-black/6 dark:border-[#3a2d58]/60'
                          }`}
                        >
                          {/* Quoted Reply Block (WhatsApp Style) */}
                          {(msg.replyTo || msg.reply_to) && (() => {
                            const q = msg.replyTo || msg.reply_to;
                            return (
                              <div className={`mb-1.5 p-2 rounded-xl border-l-4 ${isSentByMe ? 'bg-black/20 border-white/90 text-white' : 'bg-primary/10 border-primary text-[#18003d] dark:text-[#eee6ff]'} text-xs overflow-hidden`}>
                                <span className="font-bold block text-[10px] opacity-90">{q.senderName || 'Replying'}</span>
                                <p className="truncate opacity-80 text-[11px] mt-0.5">{q.text}</p>
                              </div>
                            );
                          })()}

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
                              (msg.isRead || msg.is_read) ? (
                                <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5] inline" /></span>
                              ) : (msg.is_delivered || (chatPartnerInfo?.updated_at && (Date.now() - new Date(chatPartnerInfo.updated_at).getTime() < 300000))) ? (
                                <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-white/70 stroke-[2] inline" /></span>
                              ) : (
                                <span title="Sent"><Check className="w-3.5 h-3.5 text-white/70 stroke-[2] inline" /></span>
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

                      {/* Reply */}
                      {msg && (
                        <button
                          onClick={() => handleStartReply(msg)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left hover:bg-black/5 dark:hover:bg-white/5 text-[#18003d] dark:text-[#eee6ff] transition-colors border-b border-black/5 dark:border-[#3a2d58]/60"
                        >
                          <Reply className="w-4 h-4 text-gray-400" /> Reply
                        </button>
                      )}

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

            {/* Undo Toast (delete/clear with 5s window) */}
            <AnimatePresence>
              {undoToast && (
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  className="bg-[#1c1230] text-white px-4 py-3 flex items-center justify-between gap-3 border-t border-[#3a2d58]"
                >
                  <span className="text-sm font-medium">{undoToast.label}</span>
                  <button
                    onClick={undoToast.onUndo}
                    className="text-xs font-extrabold text-yellow-300 uppercase tracking-wide px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0"
                  >
                    UNDO
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply Mode Bar (WhatsApp Style) */}
            <AnimatePresence>
              {replyingToMessage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-primary/10 dark:bg-primary/20 border-t border-primary/30 px-4 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden border-l-4 border-primary pl-2.5 py-0.5">
                    <Reply className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate text-xs">
                      <span className="font-bold text-primary block truncate">Replying to {replyingToMessage.senderName}</span>
                      <span className="text-[#3d3050] dark:text-[#c8bedd] truncate block font-medium">{replyingToMessage.text}</span>
                    </div>
                  </div>
                  <button onClick={() => setReplyingToMessage(null)} className="p-1 rounded-lg hover:bg-primary/10 text-primary shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
            <div className="bg-white/70 dark:bg-[#1c1230]/80 backdrop-blur-md border-t border-black/8 dark:border-[#3a2d58]/60">
              
              {/* Voice note preview bar (shown after stopping recording) */}
              <AnimatePresence>
                {voiceBlob && !isRecording && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center gap-3 px-4 py-2.5 bg-primary/8 dark:bg-primary/15 border-b border-primary/20"
                  >
                    <div className="flex items-center gap-px flex-1 h-8">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const heights = [3,5,8,6,10,12,7,9,11,5,8,14,10,7,12,9,6,11,8,13,6,10,7,9,5,11,8,6];
                        return <div key={i} style={{ height: `${heights[i] || 6}px`, flex: 1, minWidth: '2px' }} className="rounded-full bg-primary/60" />;
                      })}
                    </div>
                    <button
                      onClick={cancelRecording}
                      className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 transition-colors shrink-0"
                      title="Discard"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={sendVoiceNote}
                      className="p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shrink-0 shadow-md"
                      title="Send voice note"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recording active bar */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/40"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-red-600 dark:text-red-400 font-bold text-sm flex-1">
                      Recording... {formatSeconds(recordingSeconds)}
                    </span>
                    {/* Animated bars while recording */}
                    <div className="flex items-center gap-px h-7">
                      {[4,8,12,6,10,14,8,5,11,9,13,7].map((h, i) => (
                        <div key={i} style={{ height: `${h}px`, minWidth: '2px', flex: 1, animationDelay: `${i * 80}ms` }} className="rounded-full bg-red-400 animate-bounce" />
                      ))}
                    </div>
                    <button
                      onClick={cancelRecording}
                      className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      Stop
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-4 py-3 flex items-center gap-2">
                <label
                  className="p-2 rounded-2xl text-[#3d3050] dark:text-[#c8bedd] hover:bg-primary/10 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                  title="Attach Image, Video, or Document"
                >
                  <Paperclip className="w-5 h-5" />
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,application/pdf,application/msword,.doc,.docx,.txt"
                    ref={fileInputRef}
                  />
                </label>
                <button 
                  onClick={() => setShowStickerDrawer(!showStickerDrawer)}
                  className={`p-2 rounded-2xl transition-colors ${
                    showStickerDrawer ? 'text-primary bg-primary/10' : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-primary/10'
                  }`}
                  title="Emojis & Stickers"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {!isRecording && !voiceBlob ? (
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
                ) : (
                  <div className="flex-1" />
                )}
                {/* Mic button — hold to record */}
                {!editingMsgId && !chatInput && !voiceBlob && (
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                    className={`p-2.5 rounded-2xl transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30 animate-pulse'
                        : 'text-[#3d3050] dark:text-[#c8bedd] hover:bg-primary/10 hover:text-primary'
                    }`}
                    title={isRecording ? 'Recording… release to stop' : 'Hold to record voice note'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="11" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={editingMsgId ? handleSaveEdit : (voiceBlob ? sendVoiceNote : handleSendMessage)}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20 active:scale-95 hover:opacity-95"
                >
                  {editingMsgId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 p-2.5 sm:p-4 bg-[#0a0514]/60 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden"
          >
            <div className="w-full h-full max-w-5xl bg-white dark:bg-[#120b24] rounded-3xl border border-black/10 dark:border-[#3a2d58]/80 shadow-2xl flex flex-col overflow-hidden relative">
              {/* AI Header with Back Button, Avatar, Online Status, Threads, New Chat & Theme Controls */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#160e2e] border-b border-black/8 dark:border-[#2a1f45]/60 shadow-sm shrink-0">
                {/* Back */}
                <button
                  onClick={() => router.push('/partner?tab=dashboard')}
                  className="p-2 -ml-1 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-5 h-5 text-[#3d2a6b] dark:text-[#c8bedd]" />
                </button>

                {/* Nyra Avatar with online indicator */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-md border-2 border-white dark:border-[#2a1f45] overflow-hidden">
                    <img src="/logo.png" alt="Nyra" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-[#160e2e] rounded-full" />
                </div>

                {/* Name & status */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-[15px] text-[#18003d] dark:text-[#eee6ff] leading-tight">Nyra Partner AI</h2>
                  <p className="text-[11px] text-green-500 font-semibold">
                    {isPartnerAiTyping ? (
                      <span className="text-primary animate-pulse">typing...</span>
                    ) : 'Online'}
                  </p>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAiThreadsDrawer(!showAiThreadsDrawer)}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
                    title="Chat Threads"
                  >
                    <Menu className="w-5 h-5 text-[#7c3aed]" />
                  </button>
                  <button
                    onClick={handleCreateNewAiChat}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
                    title="New Chat"
                  >
                    <Plus className="w-5 h-5 text-[#7c3aed]" />
                  </button>
                  <button
                    onClick={() => setShowAiOutline(!showAiOutline)}
                    className={`p-2 rounded-full transition-colors ${showAiOutline ? 'bg-primary/15' : 'hover:bg-black/5 dark:hover:bg-white/8'}`}
                    title="Prompt Index"
                  >
                    <ListFilter className="w-5 h-5 text-[#7c3aed]" />
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/8 rounded-full transition-colors"
                    title="Toggle Theme"
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#7c3aed]" />}
                  </button>
                </div>
              </div>

              {/* Quick Prompts Bar */}
              <div className="flex gap-2 px-3 py-2 overflow-x-auto no-scrollbar bg-white/60 dark:bg-[#160e2e]/80 border-b border-black/5 dark:border-[#2a1f45]/40 shrink-0">
                <button
                  onClick={() => handleSendPartnerAi(`How can I support ${trackedUserName} during her current cycle phase?`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0e6ff] dark:bg-[#2a1f45] text-[#7c3aed] dark:text-[#c4aaff] text-[11px] font-bold shrink-0 hover:bg-[#e4d1ff] dark:hover:bg-[#3a2d58] transition-colors border border-[#d4b8ff]/40 dark:border-[#3a2d58]"
                >
                  <span>🌸</span>
                  <span>Support {trackedUserName}'s phase?</span>
                </button>
                <button
                  onClick={() => handleSendPartnerAi("What foods ease her cramps?")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0e6ff] dark:bg-[#2a1f45] text-[#7c3aed] dark:text-[#c4aaff] text-[11px] font-bold shrink-0 hover:bg-[#e4d1ff] dark:hover:bg-[#3a2d58] transition-colors border border-[#d4b8ff]/40 dark:border-[#3a2d58]"
                >
                  <span>🍫</span>
                  <span>Foods for cramps?</span>
                </button>
                <button
                  onClick={() => handleSendPartnerAi("How to comfort her when energy is low?")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0e6ff] dark:bg-[#2a1f45] text-[#7c3aed] dark:text-[#c4aaff] text-[11px] font-bold shrink-0 hover:bg-[#e4d1ff] dark:hover:bg-[#3a2d58] transition-colors border border-[#d4b8ff]/40 dark:border-[#3a2d58]"
                >
                  <span>✨</span>
                  <span>Comfort low energy?</span>
                </button>
                <button
                  onClick={() => handleSendPartnerAi("What thoughtful gestures brighten her day?")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0e6ff] dark:bg-[#2a1f45] text-[#7c3aed] dark:text-[#c4aaff] text-[11px] font-bold shrink-0 hover:bg-[#e4d1ff] dark:hover:bg-[#3a2d58] transition-colors border border-[#d4b8ff]/40 dark:border-[#3a2d58]"
                >
                  <span>💕</span>
                  <span>Gentle gestures?</span>
                </button>
              </div>

              {/* AI Messages Body */}
              <div
                className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1 relative"
                style={{ background: darkMode ? 'linear-gradient(180deg, #0d0820 0%, #130a2a 100%)' : 'linear-gradient(180deg, #f7f2ff 0%, #f0e9ff 100%)' }}
              >
                {/* Empty State */}
                {partnerAiMessages.length === 0 && !isPartnerAiTyping && (
                  <div className="flex flex-col items-center justify-center py-16 gap-5 text-center my-auto">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-xl mb-2"
                    >
                      <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-xl text-[#18003d] dark:text-[#eee6ff] mb-1">
                        Hey{user?.name ? `, ${user.name}` : ''}! 🌸
                      </h3>
                      <p className="text-[13px] text-[#6b5b95] dark:text-[#9d8fc0] font-medium leading-relaxed">
                        I'm Nyra Partner AI, your personal partner support companion.<br />
                        Ask me anything — about {trackedUserName}'s cycle phase, mood,<br />
                        cravings, or how to support her today! 💜
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Bubbles */}
                {partnerAiMessages.map((msg, idx) => {
                  const isUser = msg.senderId === 'user' || msg.senderId === user?.id;
                  const isSpeaking = speakingMessageId === msg.id;
                  const prevMsg = partnerAiMessages[idx - 1];
                  const showAvatar = !isUser && (idx === 0 || prevMsg?.senderId === 'user' || prevMsg?.senderId === user?.id);
                  const isGrouped = !isUser && idx > 0 && prevMsg?.senderId !== 'user' && prevMsg?.senderId !== user?.id;

                  return (
                    <motion.div
                      key={msg.id}
                      ref={(el) => { messageRefs.current[msg.id] = el; }}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
                    >
                      {/* Avatar on left */}
                      {!isUser && (
                        <div className="w-8 shrink-0 mr-1.5 flex items-end">
                          {showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-sm border border-white/30 overflow-hidden">
                              <img src="/logo.png" alt="Nyra" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                          ) : <div className="w-8" />}
                        </div>
                      )}

                      <div className="max-w-[78%] relative group">
                        <div className={`
                          px-4 py-2.5 rounded-2xl text-[13.5px] font-medium leading-relaxed relative select-none
                          ${isUser
                            ? 'bg-[#7c3aed] text-white rounded-tr-sm shadow-md shadow-[#7c3aed]/20'
                            : 'bg-white dark:bg-[#1e1538] text-[#18003d] dark:text-[#eee6ff] rounded-tl-sm shadow-sm border border-black/5 dark:border-[#3a2d58]/50'
                          }
                          ${isGrouped && isUser ? 'rounded-tr-2xl' : ''}
                          ${isGrouped && !isUser ? 'rounded-tl-2xl' : ''}
                        `}>
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
                        </div>

                        {/* Action buttons + time row */}
                        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="text-[#9d8fc0] hover:text-[#7c3aed] transition-colors"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleSpeakText(msg.text, msg.id)}
                            className={`transition-colors ${isSpeaking ? 'text-[#7c3aed] animate-pulse' : 'text-[#9d8fc0] hover:text-[#7c3aed]'}`}
                            title={isSpeaking ? 'Stop' : 'Read aloud'}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-[#9d8fc0] dark:text-[#6b5b95]">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isUser && <CheckCheck className="w-3 h-3 text-[#7c3aed]" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Typing indicator */}
                {isPartnerAiTyping && (
                  <div className="flex justify-start items-end gap-1.5 mt-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-white dark:bg-[#1e1538] px-4 py-3 rounded-2xl rounded-bl-sm border border-black/5 dark:border-[#3a2d58]/50 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c4aaff] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              {/* AI Input Footer */}
              <div className="bg-white/80 dark:bg-[#1c1230]/90 backdrop-blur-md px-4 py-3 border-t border-black/8 dark:border-[#3a2d58]/60 flex flex-col gap-2">
                {/* Image Preview Badge */}
                {selectedPartnerAiImage && (
                  <div className="relative inline-block w-20 h-20 rounded-xl overflow-hidden border-2 border-[#7c3aed] shadow-md ml-2">
                    <img src={selectedPartnerAiImage} alt="Selected" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setSelectedPartnerAiImage(null)}
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
                    ref={aiImageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handlePartnerAiImageSelect}
                  />

                  {/* Image Attachment Button */}
                  <button
                    onClick={() => aiImageInputRef.current?.click()}
                    className="p-2 text-[#9d8fc0] hover:text-[#7c3aed] transition-colors shrink-0"
                    title="Attach image for Partner AI"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <input 
                    type="text" 
                    placeholder={selectedPartnerAiImage ? `Ask Nyra AI about this image...` : `Ask Nyra AI how to support ${trackedUserName}...`}
                    value={partnerAiInput}
                    onChange={(e) => setPartnerAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendPartnerAi()}
                    className="flex-1 px-4 py-3 rounded-full border border-outline-variant/60 dark:border-[#3a2d58] focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 outline-none text-xs font-semibold bg-white/90 dark:bg-[#16102a] text-[#18003d] dark:text-[#eee6ff] dark:placeholder-[#8a7fa0] shadow-inner"
                  />
                  <button 
                    onClick={() => handleSendPartnerAi()}
                    disabled={(!partnerAiInput.trim() && !selectedPartnerAiImage) || isPartnerAiTyping}
                    className={`w-10 h-10 rounded-full bg-gradient-to-r from-tertiary to-primary text-white flex items-center justify-center shadow-md transition-all ${
                      (!partnerAiInput.trim() && !selectedPartnerAiImage) || isPartnerAiTyping ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                    }`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
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

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
