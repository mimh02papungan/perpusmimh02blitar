'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, User } from 'lucide-react';
import Modal from '@/components/Modal';

type AdminRole = 'ADMIN' | 'SUPERADMIN';

interface AdminUser {
    id: string;
    username: string;
    name: string | null;
    jabatan: string | null;
    role: AdminRole;
    foto_url: string | null;
    foto_object_id: string | null;
    created_at: string;
}

interface AdminFormData {
    username: string;
    password: string;
    name: string;
    jabatan: string;
    role: AdminRole;
    foto_object_id: string | null;
}

const defaultFormData: AdminFormData = {
    username: '',
    password: '',
    name: '',
    jabatan: '',
    role: 'ADMIN',
    foto_object_id: null,
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState<AdminFormData>(defaultFormData);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const json = await res.json();
            if (json.success) {
                setUsers(json.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validation: Password required for new users
        if (!editingItem && !formData.password) {
            alert('Password wajib diisi untuk user baru');
            setSubmitting(false);
            return;
        }

        try {
            let fotoObjectId = formData.foto_object_id;

            if (photoFile) {
                const uploadData = new FormData();
                uploadData.append('file', photoFile);
                uploadData.append('folder', 'admins');

                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: uploadData,
                });
                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok || !uploadJson.success) {
                    throw new Error(uploadJson.error || 'Gagal upload foto admin');
                }
                fotoObjectId = String(uploadJson.data.id);
                setPhotoPreview(uploadJson.data.public_url || null);
            }

            const url = editingItem
                ? `/api/admin/users/${editingItem.id}`
                : '/api/admin/users';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password || undefined,
                    name: formData.name,
                    jabatan: formData.jabatan,
                    role: formData.role,
                    foto_object_id: fotoObjectId,
                }),
            });

            if (res.ok) {
                setIsFormOpen(false);
                setEditingItem(null);
                setFormData(defaultFormData);
                setPhotoFile(null);
                setPhotoPreview(null);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Gagal menyimpan user');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Terjadi kesalahan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Apakah Anda yakin ingin menghapus admin ini?')) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                alert('Gagal menghapus admin');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleEdit = (item: AdminUser) => {
        setEditingItem(item);
        setFormData({
            username: item.username,
            password: '',
            name: item.name || '',
            jabatan: item.jabatan || '',
            role: item.role || 'ADMIN',
            foto_object_id: item.foto_object_id || null,
        });
        setPhotoPreview(item.foto_url || null);
        setPhotoFile(null);
        setIsFormOpen(true);
    };

    const filteredUsers = users.filter(item =>
        item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.jabatan && item.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Manajemen Admin Users</h1>
                    <p className="text-gray-400">Kelola akun administrator sistem</p>
                </div>

                <button
                    onClick={() => {
                        setEditingItem(null);
                        setFormData(defaultFormData);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setIsFormOpen(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Tambah Admin</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Cari user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                />
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-[#1a1a1a] rounded-xl border border-dashed border-white/10">
                        Tidak ada admin ditemukan
                    </div>
                ) : (
                    filteredUsers.map((item) => (
                        <div
                            key={item.id}
                            className="bg-[#1a1a1a] border border-white/5 p-6 rounded-xl hover:border-purple-500/30 transition-all group relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-purple-500/10 flex items-center justify-center text-purple-400">
                                    {item.foto_url ? (
                                        <img
                                            src={item.foto_url}
                                            alt={item.name || item.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Shield size={24} />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-2 flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${item.role === 'SUPERADMIN'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                    {item.role}
                                </span>
                                {item.jabatan && (
                                    <span className="text-xs text-gray-400">{item.jabatan}</span>
                                )}
                            </div>

                            <h3 className="font-bold text-lg mb-1">{item.name || 'Unnamed Admin'}</h3>
                            <div className="flex items-center text-sm text-gray-400 gap-2 mb-2">
                                <User size={14} />
                                <span>{item.username}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                Dibuat: {new Date(item.created_at).toLocaleDateString('id-ID')}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Form Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Edit Admin' : 'Tambah Admin Baru'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="admin-username" className="block text-sm text-gray-400 mb-2">Username *</label>
                        <input
                            id="admin-username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-name" className="block text-sm text-gray-400 mb-2">Nama Lengkap</label>
                        <input
                            id="admin-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-jabatan" className="block text-sm text-gray-400 mb-2">Jabatan</label>
                        <input
                            id="admin-jabatan"
                            type="text"
                            value={formData.jabatan}
                            onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                            placeholder="Contoh: Kepala Perpustakaan"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-role" className="block text-sm text-gray-400 mb-2">Role *</label>
                        <select
                            id="admin-role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="ADMIN" className="text-black">ADMIN</option>
                            <option value="SUPERADMIN" className="text-black">SUPERADMIN</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="admin-photo" className="block text-sm text-gray-400 mb-2">Foto Admin</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview Foto Admin" className="w-full h-full object-cover" />
                                ) : (
                                    <Shield size={20} className="text-gray-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    id="admin-photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setPhotoFile(file);
                                        if (file) {
                                            setPhotoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Upload foto ke Cloudflare R2. `foto_object_id` akan terisi otomatis.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="admin-password" className="block text-sm text-gray-400 mb-2">
                            Password {editingItem ? '(Kosongkan jika tidak ingin mengubah)' : '*'}
                        </label>
                        <input
                            id="admin-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            className="px-6 py-2 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                        >
                            {submitting
                                ? 'Menyimpan...'
                                : editingItem
                                    ? 'Simpan Perubahan'
                                    : 'Tambah Admin'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
