import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
    requireAdminSession,
    getAdminCookieOptions,
    signToken,
} from '@/lib/auth';
import { mapAdminWithStorageUrls } from '@/lib/mappers';
import { cleanupStorageObjectIfUnused } from '@/lib/storageObjects';

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const admin = await prisma.admins.findUnique({
        where: { id: auth.session.id },
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            jabatan: true,
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

    if (!admin) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        data: mapAdminWithStorageUrls(admin),
    });
}

export async function PUT(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const body = await request.json();

        const current = await prisma.admins.findUnique({
            where: { id: auth.session.id },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                jabatan: true,
                foto_url: true,
                foto_object_id: true,
                password_hash: true,
            },
        });

        if (!current) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const nextName = body.name !== undefined ? String(body.name || '').trim() || null : undefined;
        const nextJabatan =
            body.jabatan !== undefined ? String(body.jabatan || '').trim() || null : undefined;
        const nextFotoObjectId =
            body.foto_object_id !== undefined ? parseBigIntOrNull(body.foto_object_id) : undefined;

        let nextPasswordHash: string | undefined;
        if (body.newPassword !== undefined || body.oldPassword !== undefined) {
            const oldPassword = String(body.oldPassword || '');
            const newPassword = String(body.newPassword || '');

            if (!oldPassword || !newPassword) {
                return NextResponse.json(
                    { success: false, error: 'Password lama dan password baru wajib diisi' },
                    { status: 400 }
                );
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, current.password_hash);
            if (!isOldPasswordValid) {
                return NextResponse.json(
                    { success: false, error: 'Password lama tidak sesuai' },
                    { status: 400 }
                );
            }

            if (newPassword.length < 6) {
                return NextResponse.json(
                    { success: false, error: 'Password baru minimal 6 karakter' },
                    { status: 400 }
                );
            }

            nextPasswordHash = await bcrypt.hash(newPassword, 10);
        }

        const updated = await prisma.admins.update({
            where: { id: auth.session.id },
            data: {
                ...(nextName !== undefined ? { name: nextName } : {}),
                ...(nextJabatan !== undefined ? { jabatan: nextJabatan } : {}),
                ...(nextFotoObjectId !== undefined
                    ? { foto_object_id: nextFotoObjectId, foto_url: null }
                    : {}),
                ...(nextPasswordHash ? { password_hash: nextPasswordHash } : {}),
                updated_at: new Date(),
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                jabatan: true,
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

        if (nextFotoObjectId !== undefined && current.foto_object_id !== updated.foto_object_id) {
            await cleanupStorageObjectIfUnused(current.foto_object_id);
        }

        const mapped = mapAdminWithStorageUrls(updated);

        const token = await signToken({
            id: mapped.id,
            username: mapped.username,
            name: mapped.name,
            role: mapped.role,
            jabatan: mapped.jabatan,
            foto_url: mapped.foto_url,
        });

        const response = NextResponse.json({
            success: true,
            data: mapped,
            message: 'Profil berhasil diperbarui',
        });
        response.cookies.set('admin_token', token, getAdminCookieOptions());
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
