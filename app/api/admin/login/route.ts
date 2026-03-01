import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminCookieOptions, signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Username dan password wajib diisi' },
                { status: 400 }
            );
        }

        // Ambil data admin dari database
        const admin = await prisma.admins.findUnique({
            where: { username },
        });

        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'Kombinasi username dan password salah' },
                { status: 401 }
            );
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: 'Kombinasi username dan password salah' },
                { status: 401 }
            );
        }

        // Buat token JWT
        const token = await signToken({
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role,
            jabatan: admin.jabatan,
            foto_url: admin.foto_url,
        });

        // Buat response dengan cookie
        const response = NextResponse.json({
            success: true,
            message: 'Login berhasil',
            data: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role,
            },
        });

        response.cookies.set('admin_token', token, getAdminCookieOptions());

        return response;

    } catch (error: unknown) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan internal server' },
            { status: 500 }
        );
    }
}
