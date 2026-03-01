import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAdminSession } from '@/lib/auth';
import { mapAdminWithStorageUrls } from '@/lib/mappers';
import { cleanupStorageObjectIfUnused } from '@/lib/storageObjects';

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
type AdminUpdateInput = {
    updated_at: Date;
    username?: string;
    name?: string | null;
    jabatan?: string | null;
    role?: AdminRole;
    foto_url?: string | null;
    foto_object_id?: bigint | null;
    password_hash?: string;
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

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const json = await request.json();
        const { username, password, name, jabatan, role, foto_object_id } = json;

        const updates: AdminUpdateInput = {
            updated_at: new Date(),
        };

        if (username !== undefined) updates.username = username;
        if (name !== undefined) updates.name = name || null;
        if (jabatan !== undefined) updates.jabatan = jabatan || null;
        if (role !== undefined) updates.role = normalizeRole(role);
        if (foto_object_id !== undefined) {
            updates.foto_object_id = parseBigIntOrNull(foto_object_id);
        }

        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 1) {
            return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
        }

        const currentAdmin = await prisma.admins.findUnique({
            where: { id },
            select: { id: true, role: true, foto_object_id: true },
        });

        if (!currentAdmin) {
            return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
        }

        if (
            currentAdmin.role === 'SUPERADMIN' &&
            updates.role === 'ADMIN'
        ) {
            const superadminCount = await prisma.admins.count({
                where: { role: 'SUPERADMIN' },
            });
            if (superadminCount <= 1) {
                return NextResponse.json(
                    { success: false, error: 'Tidak bisa menurunkan superadmin terakhir' },
                    { status: 400 }
                );
            }
        }

        if (updates.foto_object_id !== undefined) {
            if (updates.foto_object_id === null) {
                updates.foto_url = null;
            } else {
                updates.foto_url = null;
            }
        }

        const data = await prisma.admins.update({
            where: { id },
            data: updates,
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

        if (currentAdmin.foto_object_id && currentAdmin.foto_object_id !== data.foto_object_id) {
            await cleanupStorageObjectIfUnused(currentAdmin.foto_object_id);
        }

        return NextResponse.json({ success: true, data: mapAdminResponse(data) });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        if (auth.session.id === id) {
            return NextResponse.json(
                { success: false, error: 'Tidak bisa menghapus akun sendiri' },
                { status: 400 }
            );
        }

        const targetAdmin = await prisma.admins.findUnique({
            where: { id },
            select: { id: true, role: true, foto_object_id: true },
        });

        if (!targetAdmin) {
            return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
        }

        if (targetAdmin.role === 'SUPERADMIN') {
            const superadminCount = await prisma.admins.count({
                where: { role: 'SUPERADMIN' },
            });

            if (superadminCount <= 1) {
                return NextResponse.json(
                    { success: false, error: 'Tidak bisa menghapus superadmin terakhir' },
                    { status: 400 }
                );
            }
        }

        await prisma.admins.delete({
            where: { id },
        });

        await cleanupStorageObjectIfUnused(targetAdmin.foto_object_id);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
    }
}

