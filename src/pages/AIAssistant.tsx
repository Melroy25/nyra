import React, { useState, useRef, useEffect } from 'react';
import { useNyraStore } from '../store/useNyraStore';
import { getCyclePhaseInfo } from '../utils/cycleHelpers';
import { formatDate } from '../data/mockData';
import { sendChatMessage } from '../services/aiService';
import { Send, Sparkles, Trash2, X, MessageSquare, Plus, Volume2, VolumeX, Copy, Check, Image, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AIAssistant: React.FC = () => {
  const { 
    chats, 
    activeChatId, 
    createNewChat, 
    switchChat, 
    deleteChat, 
    addChatMessage, 
    clearChat, 
    renameChat,
    profile, 
    cycles 
  } = useNyraStore();
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [tempChatName, setTempChatName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeChat = chats.find((c: any) => c.id === activeChatId) || chats[0];
  const chatMessages = activeChat.messages;

  const todayStr = formatDate(new Date());
  const cycleInfo = getCyclePhaseInfo(
    todayStr,
    cycles,
    profile.avgCycleLength,
    profile.avgPeriodLength
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage && lastMessage.sender === 'user') {
      if (!isTyping) {
        setIsTyping(true);
        
        // Try real OpenAI API first, fallback to simulated
        const fetchAIResponse = async () => {
          try {
            const response = await sendChatMessage(
              chatMessages.map(m => ({ sender: m.sender, text: m.text })),
              {
                cycleDay: cycleInfo.cycleDay,
                phaseName: cycleInfo.phaseName,
                estrogenLevel: cycleInfo.estrogenLevel,
                progesteroneLevel: cycleInfo.progesteroneLevel,
                fertilityStatus: cycleInfo.fertilityStatus,
                daysUntilNextPeriod: cycleInfo.daysUntilNextPeriod
              }
            );
            addChatMessage('ai', response);
          } catch {
            // Fallback to simulated response
            const response = getSimulatedResponse(lastMessage.text, lastMessage.images && lastMessage.images.length > 0);
            addChatMessage('ai', response);
          } finally {
            setIsTyping(false);
          }
        };
        
        fetchAIResponse();
      }
    }
  }, [chatMessages.length, isTyping]);

  const quickPrompts = [
    "Why am I bloated?",
    "Why is my period late?",
    "Why am I craving chocolate?",
    "What foods reduce cramps?"
  ];

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, msgId: string) => {
    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingId(msgId);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAttachedImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getSimulatedResponse = (query: string, hasImages?: boolean): string => {
    const q = query.toLowerCase();
    const phase = cycleInfo.phaseName;
    const day = cycleInfo.cycleDay;
    const name = profile.name;

    let prefix = '';
    if (hasImages) {
      prefix = `I've analyzed the photo attachment you uploaded, ${name}. It looks like you're tracking symptoms or foods. Here is what I recommend:\n\n`;
    }

    if (q.includes('bloat')) {
      return prefix + `Hi ${name}, bloating is extremely common, especially around Day ${day} (your ${phase} phase). During the late Luteal phase, high progesterone slows down digestion. If you're currently bleeding, it is due to water retention from early cycle hormonal shifts. I suggest drinking warm peppermint or ginger tea, avoiding carbonated drinks, and performing gentle abdominal twists.`;
    }
    
    if (q.includes('late')) {
      return prefix + `A delayed period can happen for several reasons, ${name}. Since your average cycle is ${profile.avgCycleLength} days, minor variations of 2-5 days are completely normal. Stress, changes in sleep, strenuous exercise, or travel can delay ovulation, pushing back your period. If you are experiencing high stress, try restorative practices like meditation or deep breathing.`;
    }

    if (q.includes('chocolate')) {
      return prefix + `Craving chocolate is a classic hormonal response, ${name}! In the Luteal phase (days 17-28), progesterone rises and then falls, which drops blood sugar and serotonin. Your brain craves chocolate because it contains magnesium (which relaxes muscles) and sugar (for a quick serotonin boost). Try 70%+ dark chocolate, almonds, or bananas for a healthier release.`;
    }

    if (q.includes('sugar') || q.includes('sweet')) {
      return prefix + `Craving sugar is very common, ${name}. Progesterone shifts can make your body less sensitive to insulin, leading to rapid blood sugar crashes. Your brain triggers sugar cravings for fast energy. I recommend having berries with Greek yogurt, apples with cinnamon, or dates stuffed with peanut butter to stabilize your blood sugar.`;
    }

    if (q.includes('salty') || q.includes('salt')) {
      return prefix + `Craving salty foods indicates aldosterone/adrenal stress shifts, ${name}. Water retention changes and high stress (cortisol) can deplete sodium. Your body seeks salt to maintain blood volume and mineral balances. Try salted pumpkin seeds, celery with hummus, or baked sweet potato fries instead of high-sodium chips.`;
    }

    if (q.includes('spicy') || q.includes('spice')) {
      return prefix + `Craving spicy food typically relates to body temperature shifts and serotonin needs, ${name}. Spicy capsaicin triggers a minor sweat response which helps regulate luteal phase hot flashes, and stimulates endorphins/dopamine release. Try spicy avocado toast or roasted chickpeas with cayenne.`;
    }

    if (q.includes('carb') || q.includes('bread') || q.includes('pasta')) {
      return prefix + `Craving carbohydrates is natural because your basal metabolic rate increases by 100-300 calories during the Luteal phase, ${name}. Your body is physically burning more energy and prompts carb-heavy triggers to raise serotonin. Try slow-burning complex carbs like a quinoa bowl, oatmeal, or sweet potatoes.`;
    }

    if (q.includes('cramp') || q.includes('pain')) {
      return prefix + `To alleviate cramps, ${name}, it helps to understand that prostaglandins are causing your uterine muscles to contract. Since you are in your ${phase} phase (Day ${day}), applying a hot water bottle for 15 minutes is clinically proven to relax those muscles. Magnesium supplements, chamomile tea, and avoiding inflammatory foods like excess caffeine and dairy will also significantly help.`;
    }

    if (q.includes('nutrition') || q.includes('food') || q.includes('eat') || q.includes('craving')) {
      return prefix + `For your current ${phase} phase (Day ${day}), your body benefits most from specific nutrient-dense options. I recommend eating magnesium-rich leafy greens, healthy fats like avocados, and lean proteins like salmon to maintain hormonal stability. Try to limit high-sodium processed snacks which worsen swelling and bloating.`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return prefix + `Hello ${name}! I'm Nyra, your wellness companion. We are currently on Day ${day} (${phase} Phase) of your cycle. How are you feeling today physically, and how can I help guide your wellness?`;
    }

    if (hasImages) {
      return `I see the picture you uploaded! In your current ${phase} phase (Day ${day}), keeping track of your physical symptoms or food is highly recommended. Make sure to log details, stay hydrated, and let me know if you need specific cycle analysis!`;
    }

    // Default response
    return `That's an important question, ${name}. During your ${phase} phase (Day ${day}), your estrogen level is ${cycleInfo.estrogenLevel} and progesterone is ${cycleInfo.progesteroneLevel}. These baseline levels can affect your sleep, energy, and cravings. To support your body today, focus on logging 8 cups of water, doing light stretching, and eating whole foods. Would you like suggestions on cycle-based exercises or meals?`;
  };

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() && attachedImages.length === 0) return;
    
    // Add user message with images
    addChatMessage('user', textToSend, attachedImages);
    setAttachedImages([]);
    setInput('');
    // The useEffect above will handle getting the AI response
  };

  return (
    <div className="flex-1 flex flex-col pt-[68px] h-full bg-bgsoft relative overflow-hidden">
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950 z-40"
              onClick={() => setShowSidebar(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-purple-100 dark:border-white/10 z-50 p-4 flex flex-col justify-between"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-purple-50 dark:border-white/10">
                  <h4 className="font-serif text-sm font-bold text-textpurple flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" /> Chat Threads
                  </h4>
                  <button 
                    onClick={() => setShowSidebar(false)}
                    className="w-6 h-6 rounded-full bg-purple-50 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:bg-purple-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* New Chat Button */}
                <button
                  onClick={() => {
                    createNewChat();
                    setShowSidebar(false);
                  }}
                  className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Chat
                </button>

                 {/* Chats List */}
                <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
                  {chats.map((ch: any, idx: number) => {
                    const isActive = ch.id === activeChatId;
                    const lastMsg = ch.messages[ch.messages.length - 1]?.text || 'Empty Chat';
                    const snippet = lastMsg.length > 28 ? lastMsg.substring(0, 28) + '...' : lastMsg;
                    const isEditing = editingChatId === ch.id;
                    const displayName = ch.name || `Chat #${idx + 1}`;
                    
                    return (
                      <div 
                        key={ch.id}
                        className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                          isActive 
                            ? 'bg-primary/10 border-primary/30 text-primary font-bold' 
                            : 'bg-slate-50 dark:bg-white/5 border-purple-100/30 dark:border-white/5 text-textpurple hover:bg-purple-50/50 dark:hover:bg-white/10'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex gap-1.5 items-center w-full">
                            <input
                              type="text"
                              value={tempChatName}
                              onChange={(e) => setTempChatName(e.target.value)}
                              className="flex-1 px-2 py-1 bg-white dark:bg-slate-800 text-[11px] rounded border border-purple-100 dark:border-white/10 text-textpurple font-normal focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameChat(ch.id, tempChatName);
                                  setEditingChatId(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                renameChat(ch.id, tempChatName);
                                  setEditingChatId(null);
                              }}
                              className="text-emerald-500 hover:text-emerald-600 text-[11px] font-bold px-1 cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingChatId(null)}
                              className="text-slate-400 hover:text-slate-500 text-[11px] font-bold px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <button
                              onClick={() => {
                                switchChat(ch.id);
                                setShowSidebar(false);
                              }}
                              className="flex-1 text-left text-xs truncate cursor-pointer pr-1"
                            >
                              {displayName}
                              <span className="block text-[9px] text-slate-400 font-normal truncate mt-0.5">
                                {snippet}
                              </span>
                            </button>
                            <div className="flex gap-1 items-center shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChatId(ch.id);
                                  setTempChatName(displayName);
                                }}
                                className="text-slate-400 hover:text-primary transition-colors p-1 cursor-pointer"
                                title="Rename Chat"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(ch.id);
                                }}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                title="Delete Chat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Banner Context */}
      <div className="bg-purple-50/70 border-b border-purple-100 p-3 px-5 flex items-center justify-between text-xs text-textpurple shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSidebar(true)}
            className="w-7 h-7 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center transition-colors cursor-pointer"
            title="Open Chats Menu"
          >
            <Sparkles className="w-4 h-4 fill-primary/10" />
          </button>
          <span>Nyra: Day {cycleInfo.cycleDay} • {cycleInfo.phaseName} Phase</span>
        </div>
        <button 
          onClick={clearChat}
          className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
          title="Clear Chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px]">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg: any) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  isUser 
                    ? 'bg-gradient-to-r from-primary to-accent text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-textpurple dark:text-purple-100 border border-purple-100/70 dark:border-white/5 rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <span className="block text-[8px] uppercase tracking-widest font-extrabold text-primary mb-1">
                    Nyra
                  </span>
                )}
                <p className="whitespace-pre-line">{msg.text}</p>
                
                {/* Images inside bubble */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.images.map((img: string, i: number) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt="Attachment" 
                        className="w-16 h-16 object-cover rounded-lg border border-purple-100 dark:border-white/10"
                      />
                    ))}
                  </div>
                )}

                {/* Bubble action toolbar and timestamp */}
                <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-purple-50/50 dark:border-white/5">
                  <div className="flex gap-2 items-center">
                    {/* Speak Button */}
                    <button
                      onClick={() => handleSpeak(msg.text, msg.id)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        isUser ? 'text-purple-100 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-primary'
                      }`}
                      title={speakingId === msg.id ? "Stop Speaking" : "Read Aloud"}
                    >
                      {speakingId === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        isUser ? 'text-purple-100 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-primary'
                      }`}
                      title="Copy to Clipboard"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  
                  <span className={`text-[8px] ${isUser ? 'text-purple-100' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* AI Typing Indicator */}
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/80 border border-purple-50 text-textpurple p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1">
              <span className="block text-[8px] uppercase tracking-widest font-extrabold text-primary mr-1.5">
                Nyra is typing
              </span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ChatGPT-style Prompt Outline Navigator - Collapsible Slide Drawer */}
      <AnimatePresence>
        {chatMessages.filter(m => m.sender === 'user').length > 0 && showOutline && (
          <>
            {/* Click-outside backdrop to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-25 bg-slate-950/20"
              onClick={() => setShowOutline(false)}
            />
            
            <motion.div
              initial={{ x: 180, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 180, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-48 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-l-2xl border-l border-y border-purple-100/70 dark:border-white/10 shadow-2xl z-30 max-h-[60%] flex flex-col gap-2"
            >
              <div className="flex justify-between items-center border-b border-purple-50 dark:border-white/5 pb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Outline</span>
                <button 
                  onClick={() => setShowOutline(false)}
                  className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                {chatMessages.filter(m => m.sender === 'user').map((msg: any, index: number) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setShowOutline(false); // Close on select
                    }}
                    className="w-full flex items-start gap-2 py-1 px-1.5 rounded hover:bg-primary/5 dark:hover:bg-white/5 text-left transition-colors cursor-pointer text-[10px]"
                    title={msg.text}
                  >
                    <span className="font-bold text-primary shrink-0">#{index + 1}</span>
                    <span className="text-textpurple dark:text-purple-100 truncate">{msg.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Side Handle Slide Bar (Trigger) */}
      {chatMessages.filter(m => m.sender === 'user').length > 0 && !showOutline && (
        <motion.button
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          onClick={() => setShowOutline(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-16 bg-slate-400/10 hover:bg-slate-400/20 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex flex-col gap-1 items-center justify-center rounded-l-lg border-l border-y border-purple-100/20 dark:border-white/5 cursor-pointer z-30 transition-colors"
          title="Open Prompt Outline"
        >
          <ChevronLeft className="w-3 h-3 opacity-50" />
          <div className="flex flex-col gap-0.5 items-center opacity-50">
            <div className="w-0.5 h-0.5 bg-current rounded-full" />
            <div className="w-0.5 h-0.5 bg-current rounded-full" />
            <div className="w-0.5 h-0.5 bg-current rounded-full" />
          </div>
        </motion.button>
      )}

      {/* Quick Prompt Chips (Only shown if last message isn't typing) */}
      {!isTyping && chatMessages.length === 1 && (
        <div className="px-4 pb-2 flex flex-col gap-1.5">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1">Suggested Questions</span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-[10px] font-medium text-textpurple bg-purple-50 hover:bg-purple-100 border border-purple-100/50 py-1.5 px-3 rounded-full transition-colors text-left cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staged Image Previews */}
      {attachedImages.length > 0 && (
        <div className="px-4 py-2 bg-purple-50/40 dark:bg-slate-900/40 border-t border-purple-100/60 dark:border-white/10 flex flex-wrap gap-2 items-center shrink-0">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-purple-200 dark:border-white/20">
              <img src={img} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveAttachedImage(idx)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/85 transition-colors cursor-pointer text-[9px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-purple-100 dark:border-white/10 flex gap-2.5 items-center">
        {/* Attachment Input Button */}
        <label className="w-10 h-10 rounded-2xl border border-purple-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer shrink-0">
          <Image className="w-4 h-4" />
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageChange}
          />
        </label>
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend(input);
          }}
          placeholder="Ask Nyra about your symptoms, cramps, sleep..."
          className="flex-1 px-4 py-3 rounded-2xl text-xs border border-purple-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-textpurple dark:text-purple-100 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
        />
        <button
          onClick={() => handleSend(input)}
          className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center shadow-md hover:opacity-95 transition-opacity cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
