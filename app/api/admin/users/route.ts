import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAdminSession } from '@/lib/auth';
import { mapAdminWithStorageUrls } from '@/lib/mappers';

const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];
type AdminApiRow = {
    id: string;
    username: string;
    name: string | null;
    jabatan: string | null;
    role: AdminRole;
    foto_url: string | null;
    foto_object_id: bigint | null;
    foto_object: {
        bucket: string;
        object_key: string;
    } | null;
    created_at: Date | null;
    updated_at: Date | null;
};

function normalizeRole(value: unknown): AdminRole {
    if (typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole)) {
        return value as AdminRole;
    }
    return 'ADMIN';
}

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

function mapAdminResponse(admin: AdminApiRow) {
    return mapAdminWithStorageUrls(admin);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
}

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const data = await prisma.admins.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                jabatan: true,
                role: true,
                foto_url: true,
                foto_object_id: true,
                foto_object: {
                    select: {
                        bucket: true,
                        object_key: true,
                    },
                },
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        return NextResponse.json({ success: true, data: data.map(mapAdminResponse) });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const json = await request.json();
        const { username, password, name, jabatan, role, foto_object_id } = json;

        if (!username || !password) {
            return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const fotoObjectIdValue = parseBigIntOrNull(foto_object_id);

        const data = await prisma.admins.create({
            data: {
                username,
                password_hash,
                name: name || null,
                jabatan: jabatan || null,
                role: normalizeRole(role),
                foto_url: null,
                foto_object_id: fotoObjectIdValue,
                updated_at: new Date(),
            },
            select: {
                id: true,
                username: true,
                name: true,
                jabatan: true,
                role: true,
                foto_url: true,
                foto_object_id: true,
                foto_object: {
                    select: {
                        bucket: true,
                        object_key: true,
                    },
                },
                created_at: true,
                updated_at: true,
            },
        });

        return NextResponse.json({ success: true, data: mapAdminResponse(data) });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
    }
}

