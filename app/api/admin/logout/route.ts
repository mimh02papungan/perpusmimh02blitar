import { NextResponse } from 'next/server';
import { ADMIN_TOKEN_COOKIE, getAdminCookieOptions } from '@/lib/auth';

export async function POST() {
    const response = NextResponse.json({ success: true, message: 'Logout berhasil' });

    response.cookies.set(ADMIN_TOKEN_COOKIE, '', {
        ...getAdminCookieOptions(),
        maxAge: 0,
    });

    return response;
}
