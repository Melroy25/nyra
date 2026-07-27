import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.slice(7);
  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nyra-super-secret-jwt-key-2025-secure') as any;
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const supabase = supabaseAdmin();
    // Upsert: each endpoint is unique per device
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription, endpoint: subscription.endpoint, updated_at: new Date().toISOString() },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.warn('push_subscriptions upsert error:', error.message);
      return res.status(200).json({ ok: true, warning: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
