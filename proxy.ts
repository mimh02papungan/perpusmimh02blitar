import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth';

const SUPERADMIN_PAGES = ['/admin/users', '/admin/settings', '/admin/storage'];
const SUPERADMIN_API_PREFIX = ['/api/admin/users', '/api/admin/storage'];

function isSuperadminPage(pathname: string): boolean {
    return SUPERADMIN_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isSuperadminApi(pathname: string): boolean {
    return SUPERADMIN_API_PREFIX.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = await getAdminSession(request);

    if (pathname === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        return NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/login') {
            if (session) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
            return NextResponse.next();
        }

        if (!session) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        if (isSuperadminPage(pathname) && session.role !== 'SUPERADMIN') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    if (pathname.startsWith('/api/admin')) {
        if (pathname === '/api/admin/login') {
            return NextResponse.next();
        }

        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (isSuperadminApi(pathname) && session.role !== 'SUPERADMIN') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/admin/:path*', '/api/admin/:path*'],
};
