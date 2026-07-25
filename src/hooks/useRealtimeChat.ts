import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type NewMessageCallback = (message: any) => void;

// Hook: subscribe to realtime new messages in a chat thread
// Calls onNewMessage whenever a new row is inserted into chat_messages for this threadId
export function useRealtimeChat(threadId: string | null, onNewMessage: NewMessageCallback) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          callbackRef.current(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);
}
