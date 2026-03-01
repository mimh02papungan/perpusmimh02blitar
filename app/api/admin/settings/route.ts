import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const { oldPassword, newPassword } = await request.json();

        if (!oldPassword || !newPassword) {
            return NextResponse.json({ success: false, error: 'Password lama dan baru wajib diisi' }, { status: 400 });
        }

        // Fetch user from DB to get current password hash
        const user = await prisma.admins.findUnique({
            where: { id: String(auth.session.id) },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ success: false, error: 'Password lama salah' }, { status: 400 });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.admins.update({
            where: { id: String(auth.session.id) },
            data: {
                password_hash: newPasswordHash,
                updated_at: new Date(),
            },
        });

        return NextResponse.json({ success: true, message: 'Password berhasil diubah' });

    } catch (error: unknown) {
        if (error instanceof Error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, error: 'Unknown error' }, { status: 500 });
    }
}

