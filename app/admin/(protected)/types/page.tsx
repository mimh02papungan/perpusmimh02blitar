'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';

interface MediaType {
    id: number;
    name: string;
    icon: string;
    description?: string;
    created_at: string;
}

export default function TypesPage() {
    const [types, setTypes] = useState<MediaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MediaType | null>(null);
    const [formData, setFormData] = useState({ name: '', icon: '📄', description: '' });

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/types');
            const json = await res.json();
            if (json.success) {
                setTypes(json.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch types:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingItem
                ? `/api/admin/types/${editingItem.id}`
                : '/api/admin/types';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsFormOpen(false);
                setEditingItem(null);
                setFormData({ name: '', icon: '📄', description: '' });
                fetchTypes();
            } else {
                alert('Gagal menyimpan tipe media');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Terjadi kesalahan');
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (
            !confirm(
                'Apakah Anda yakin ingin menghapus tipe media ini?\n\nPENGHAPUSAN DATA PARENT AKAN MENGHAPUS DATA CHILDREN (media pada tipe ini).'
            )
        ) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/types/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTypes();
            } else {
                alert('Gagal menghapus tipe media');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleEdit = (item: MediaType) => {
        setEditingItem(item);
        setFormData({ name: item.name, icon: item.icon, description: item.description || '' });
        setIsFormOpen(true);
    };

    const filteredTypes = types.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const commonIcons = ['📄', '🎬', '🎵', '📸', '📊', '📁', '📝', '🎨', '💾', '📦', '🗂️', '📋'];

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Manajemen Tipe Media</h1>
                    <p className="text-gray-400">Kelola tipe media pembelajaran</p>
                </div>

                <button
                    onClick={() => {
                        setEditingItem(null);
                        setFormData({ name: '', icon: '📄', description: '' });
                        setIsFormOpen(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Tambah Tipe Media</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Cari tipe media..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                />
            </div>

            {/* Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredTypes.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-[#1a1a1a] rounded-xl border border-dashed border-white/10">
                        Tidak ada tipe media ditemukan
                    </div>
                ) : (
                    filteredTypes.map((item) => (
                        <div
                            key={item.id}
                            className="bg-[#1a1a1a] border border-white/5 p-6 rounded-xl hover:border-purple-500/30 transition-all group relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{item.icon}</div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                            {item.description && (
                                <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Form Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Edit Tipe Media' : 'Tambah Tipe Media Baru'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Icon</label>
                        <div className="grid grid-cols-6 gap-2 mb-3">
                            {commonIcons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`text-3xl p-3 rounded-lg border transition-all ${formData.icon === icon
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            placeholder="Atau ketik emoji..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Nama Tipe Media *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Deskripsi</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                        >
                            {editingItem ? 'Simpan Perubahan' : 'Tambah Tipe Media'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
