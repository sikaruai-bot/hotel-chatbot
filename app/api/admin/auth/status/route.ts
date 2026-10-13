import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = validateAdminRequest(req);
  return NextResponse.json({
    authenticated: auth.authenticated,
    role: auth.payload?.role || null,
  });
}
