import type { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';
import { supabaseAdmin } from '../../../lib/supabase';

// Configure VAPID details once
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@nyraapp.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

/**
 * Send a Web Push notification to all devices of a specific user.
 * Called internally (no auth check) — only triggered by server-side code.
 */
export async function sendPushToUser(
  targetUserId: string,
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string }
) {
  try {
    const supabase = supabaseAdmin();
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription, endpoint')
      .eq('user_id', targetUserId);

    if (error || !subs || subs.length === 0) return;

    const deadEndpoints: string[] = [];

    await Promise.allSettled(
      subs.map(async (row: any) => {
        try {
          await webpush.sendNotification(
            row.subscription,
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/logo.png',
              badge: '/logo.png',
              url: payload.url || '/partner?tab=chat',
              tag: payload.tag || 'nyra-chat',
            })
          );
        } catch (err: any) {
          // 410 Gone = subscription expired/unsubscribed, clean it up
          if (err.statusCode === 410 || err.statusCode === 404) {
            deadEndpoints.push(row.endpoint);
          }
        }
      })
    );

    // Remove dead subscriptions
    if (deadEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', deadEndpoints);
    }
  } catch (err) {
    console.warn('sendPushToUser error:', err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(405).json({ error: 'Method not allowed' });
}
