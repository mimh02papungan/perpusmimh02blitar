import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export type AdminRole = 'ADMIN' | 'SUPERADMIN';

export interface AdminTokenPayload extends JWTPayload {
    id: string;
    username: string;
    name?: string | null;
    role: AdminRole;
    jabatan?: string | null;
    foto_url?: string | null;
}

export const ADMIN_TOKEN_COOKIE = 'admin_token';

type SignTokenPayload = {
    id: string;
    username: string;
    name?: string | null;
    role: AdminRole;
    jabatan?: string | null;
    foto_url?: string | null;
};

const rawSecret =
    process.env.ADMIN_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-admin-jwt-secret-change-me';
const JWT_SECRET = new TextEncoder().encode(rawSecret);

function normalizeRole(value: unknown): AdminRole {
    return value === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
}

function toAdminPayload(payload: JWTPayload): AdminTokenPayload | null {
    if (!payload?.id || !payload?.username) return null;

    return {
        ...payload,
        id: String(payload.id),
        username: String(payload.username),
        name: payload.name ? String(payload.name) : null,
        role: normalizeRole(payload.role),
        jabatan: payload.jabatan ? String(payload.jabatan) : null,
        foto_url: payload.foto_url ? String(payload.foto_url) : null,
    };
}

export async function signToken(payload: SignTokenPayload) {
    return await new SignJWT({
        id: payload.id,
        username: payload.username,
        name: payload.name ?? null,
        role: normalizeRole(payload.role),
        jabatan: payload.jabatan ?? null,
        foto_url: payload.foto_url ?? null,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AdminTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return toAdminPayload(payload);
    } catch {
        return null;
    }
}

export async function getAdminSession(request: NextRequest): Promise<AdminTokenPayload | null> {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function getAdminSessionFromCookies(): Promise<AdminTokenPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
    const payload = await getAdminSession(request);
    return !!payload;
}

export function adminAuthErrorResponse(status: 401 | 403, message?: string) {
    return NextResponse.json(
        {
            success: false,
            error: message || (status === 401 ? 'Unauthorized' : 'Forbidden'),
        },
        { status }
    );
}

export async function requireAdminSession(
    request: NextRequest,
    options?: { superadmin?: boolean }
): Promise<
    | { ok: true; session: AdminTokenPayload; response: null }
    | { ok: false; session: null; response: NextResponse }
> {
    const session = await getAdminSession(request);
    if (!session) {
        return { ok: false, session: null, response: adminAuthErrorResponse(401) };
    }

    if (options?.superadmin && session.role !== 'SUPERADMIN') {
        return { ok: false, session: null, response: adminAuthErrorResponse(403) };
    }

    return { ok: true, session, response: null };
}

export function getAdminCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 24,
    };
}
