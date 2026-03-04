'use client';

import { useEffect, useState } from 'react';
import { Save, Shield, Upload } from 'lucide-react';

type AdminRole = 'ADMIN' | 'SUPERADMIN';

interface MeData {
    id: string;
    username: string;
    name: string | null;
    jabatan: string | null;
    role: AdminRole;
    foto_url: string | null;
    foto_object_id: string | null;
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [me, setMe] = useState<MeData | null>(null);
    const [name, setName] = useState('');
    const [jabatan, setJabatan] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const fetchMe = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/me');
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal memuat profil');
            }
            const data = json.data as MeData;
            setMe(data);
            setName(data.name || '');
            setJabatan(data.jabatan || '');
            setPhotoPreview(data.foto_url || null);
        } catch (error: unknown) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Gagal memuat profil' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const uploadPhotoIfNeeded = async (): Promise<string | null | undefined> => {
        if (!photoFile) return undefined;

        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: {
                'Content-Type': photoFile.type || 'application/octet-stream',
                'x-upload-folder': 'admins',
                'x-upload-filename': encodeURIComponent(photoFile.name || 'photo.bin'),
            },
            body: photoFile,
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
            throw new Error(json.error || 'Gagal upload foto');
        }

        return String(json.data.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            if (newPassword || confirmPassword || oldPassword) {
                if (!oldPassword || !newPassword || !confirmPassword) {
                    throw new Error('Isi password lama, password baru, dan konfirmasi password');
                }
                if (newPassword !== confirmPassword) {
                    throw new Error('Konfirmasi password baru tidak cocok');
                }
            }

            const fotoObjectId = await uploadPhotoIfNeeded();

            const body: Record<string, unknown> = {
                name,
                jabatan,
            };

            if (fotoObjectId !== undefined) {
                body.foto_object_id = fotoObjectId;
            }

            if (newPassword) {
                body.oldPassword = oldPassword;
                body.newPassword = newPassword;
            }

            const res = await fetch('/api/admin/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal menyimpan profil');
            }

            setMessage({ type: 'success', text: json.message || 'Profil berhasil disimpan' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPhotoFile(null);
            await fetchMe();
        } catch (error: unknown) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Gagal menyimpan profil' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-gray-400">Memuat profil...</div>;
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Profil Saya</h1>
                <p className="text-gray-400">Kelola data akun dan password Anda sendiri</p>
            </div>

            {message && (
                <div
                    className={`mb-6 p-4 rounded-xl ${
                        message.type === 'success'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8 space-y-6 max-w-3xl">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Foto Profil" className="w-full h-full object-cover" />
                        ) : (
                            <Shield className="text-gray-500" size={28} />
                        )}
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm text-gray-400 mb-2">Foto Profil</label>
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer text-sm">
                            <Upload size={14} />
                            Upload Foto
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setPhotoFile(file);
                                    if (file) {
                                        setPhotoPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Username</label>
                        <input
                            type="text"
                            value={me?.username || ''}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Role</label>
                        <input
                            type="text"
                            value={me?.role || ''}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Jabatan</label>
                        <input
                            type="text"
                            value={jabatan}
                            onChange={(e) => setJabatan(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <h2 className="font-semibold mb-4">Ganti Password</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Password Lama</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Password Baru</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Konfirmasi Password Baru</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
            </form>
        </div>
    );
}
