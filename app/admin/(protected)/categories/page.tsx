'use client';

import { useEffect, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';

interface Category {
    id: number;
    name: string;
    created_at: string;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/categories', { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                setCategories(json.filters.categories || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingItem ? `/api/admin/categories/${editingItem.id}` : '/api/admin/categories';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsFormOpen(false);
                setEditingItem(null);
                setFormData({ name: '' });
                fetchCategories();
            } else {
                alert('Gagal menyimpan kategori');
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
                'Apakah Anda yakin ingin menghapus kategori ini?\n\nSemua media turunan akan ikut dihapus, termasuk file terkait di R2. Tindakan ini tidak dapat dibatalkan.'
            )
        ) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
            } else {
                alert('Gagal menghapus kategori');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleEdit = (item: Category) => {
        setEditingItem(item);
        setFormData({ name: item.name });
        setIsFormOpen(true);
    };

    const filteredCategories = categories.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Manajemen Kategori</h1>
                    <p className="text-gray-400">Kelola kategori media pembelajaran</p>
                </div>

                <button
                    onClick={() => {
                        setEditingItem(null);
                        setFormData({ name: '' });
                        setIsFormOpen(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Tambah Kategori</span>
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Cari kategori..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredCategories.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-[#1a1a1a] rounded-xl border border-dashed border-white/10">
                        Tidak ada kategori ditemukan
                    </div>
                ) : (
                    filteredCategories.map((item) => (
                        <div
                            key={item.id}
                            className="bg-[#1a1a1a] border border-white/5 p-6 rounded-xl hover:border-purple-500/30 transition-all relative"
                        >
                            <div className="flex items-start justify-end mb-4">
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
                            <h3 className="font-bold text-lg">{item.name}</h3>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="category-name" className="block text-sm text-gray-400 mb-2">
                            Nama Kategori *
                        </label>
                        <input
                            id="category-name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                            {editingItem ? 'Simpan Perubahan' : 'Tambah Kategori'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
