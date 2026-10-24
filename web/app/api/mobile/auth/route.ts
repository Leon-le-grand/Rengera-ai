import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/app/auth-actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Enter your email and password.' }, { status: 400 });
    }

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);

    const result = await signIn(formData);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Sign in failed.' }, { status: 401 });
    }

    // Return account info (no cookie needed for mobile — token-based)
    return NextResponse.json({
      success: true,
      user: result.user || null,
      account: result.account || null,
    });
  } catch (error) {
    console.error('Mobile auth error:', error);
    return NextResponse.json({ success: false, error: 'Server error. Please try again.' }, { status: 500 });
  }
}
