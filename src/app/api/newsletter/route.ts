import { NextRequest } from 'next/server';
import { ok, fail, ApiError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit({ key: 'newsletter', limit: 5, windowMs: 60000 });
    if (!rl.ok) throw new ApiError('RATE_LIMIT', 'Too many attempts. Try again later.', 429);

    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    if (!email) throw new ApiError('VALIDATION', 'Email is required.', 400, { email: 'A valid email is required.' });
    if (!email.includes('@') || !email.includes('.')) throw new ApiError('VALIDATION', 'That does not look like a valid email.', 400, { email: 'Enter a valid email address.' });

    // upsert: if already subscribed, just activate
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: { active: true },
      create: { email, source: 'footer' },
    });

    return ok({ success: true, message: 'You are on the list.' });
  } catch (e) {
    // handle unique constraint error gracefully
    if (e && typeof e === 'object' && 'code' in e && (e as any).code === 'P2002') {
      return ok({ success: true, message: 'You are already on the list.' });
    }
    return fail(e);
  }
}
