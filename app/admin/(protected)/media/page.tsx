'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Pin, PinOff, Link as LinkIcon, RotateCcw } from 'lucide-react';
import Modal from '@/components/Modal';
import MediaForm from '@/components/admin/MediaForm';

const MAX_PINNED_MEDIA = 6;

interface MediaItem {
    id: number;
    title: string;
    description: string | null;
    thumbnail_url: string;
    file_url: string;
    file_object_id: string | null;
    thumbnail_object_id: string | null;
    visibility: string | null;
    view_count: number | null;
    download_count: number | null;
    created_at: string;
    category_id: number;
    level_id: number;
    media_type_id: number;
    source_type: string | null;
    external_url: string | null;
    is_pinned: boolean | null;
    media_types: { name: string | null } | null;
    categories: { name: string | null } | null;
    levels: { name: string | null } | null;
}

export default function MediaPage() {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'private'>('public');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
    const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/media?limit=1000');
            const json = await res.json();

            if (json.success && json.data) {
                setMedia(json.data);
            } else {
                setMedia([]);
            }
        } catch (error) {
            console.error('Failed to fetch media:', error);
            setMedia([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Apakah Anda yakin ingin menghapus media ini?')) return;

        try {
            const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchMedia();
            } else {
                alert('Gagal menghapus media');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleEdit = (item: MediaItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleTogglePin = async (item: MediaItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.is_pinned) {
            const pinnedCount = media.filter((entry) => Boolean(entry.is_pinned)).length;
            if (pinnedCount >= MAX_PINNED_MEDIA) {
                alert(`Maksimal pin hanya ${MAX_PINNED_MEDIA} media`);
                return;
            }
        }

        try {
            const res = await fetch(`/api/admin/media/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_pinned: !item.is_pinned }),
            });

            if (res.ok) {
                fetchMedia();
            } else {
                const json = await res.json().catch(() => null);
                alert(json?.error || 'Gagal mengubah status pin');
            }
        } catch (error) {
            console.error('Pin toggle error', error);
            alert('Gagal mengubah status pin');
        }
    };

    const handleResetStats = async (item: MediaItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Reset statistik "${item.title}"? (views & unduhan akan jadi 0)`)) return;

        try {
            const res = await fetch(`/api/admin/media/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ view_count: 0, download_count: 0 }),
            });

            if (res.ok) {
                fetchMedia();
                if (viewingItem?.id === item.id) {
                    setViewingItem({ ...item, view_count: 0, download_count: 0 });
                }
            } else {
                const json = await res.json().catch(() => null);
                alert(json?.error || 'Gagal mereset statistik');
            }
        } catch (error) {
            console.error('Reset stats error', error);
            alert('Gagal mereset statistik');
        }
    };

    const publicCount = media.filter((item) => item.visibility !== 'private').length;
    const privateCount = media.filter((item) => item.visibility === 'private').length;

    const filteredMedia = media.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const itemVisibility = item.visibility === 'private' ? 'private' : 'public';
        return matchesSearch && itemVisibility === visibilityFilter;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Manajemen Media</h1>
                    <p className="text-gray-400">Kelola semua konten pembelajaran digital</p>
                </div>

                <button
                    onClick={() => {
                        setEditingItem(null);
                        setIsFormOpen(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Tambah Media</span>
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Cari berdasarkan judul..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                />
            </div>

            <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-[#1a1a1a] p-1">
                <button
                    type="button"
                    onClick={() => setVisibilityFilter('public')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        visibilityFilter === 'public'
                            ? 'bg-green-500/20 text-green-300'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Public ({publicCount})
                </button>
                <button
                    type="button"
                    onClick={() => setVisibilityFilter('private')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        visibilityFilter === 'private'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Private ({privateCount})
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredMedia.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#1a1a1a] rounded-xl border border-dashed border-white/10">
                        Tidak ada media {visibilityFilter} ditemukan
                    </div>
                ) : (
                    filteredMedia.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setViewingItem(item);
                                setIsDetailOpen(true);
                            }}
                            className="bg-[#1a1a1a] border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 hover:border-purple-500/30 transition-all group cursor-pointer"
                        >
                            <div className="w-24 aspect-[3/4] sm:w-20 sm:h-20 sm:aspect-auto bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-grow min-w-0 w-full">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {item.media_types?.name}
                                    </span>
                                    {item.source_type === 'link' && (
                                        <span className="text-[10px] font-bold bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                            <LinkIcon size={10} />
                                            Link
                                        </span>
                                    )}
                                    {item.is_pinned && (
                                        <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded uppercase tracking-wider">
                                            Pinned
                                        </span>
                                    )}
                                    <span className="text-[10px] font-bold bg-white/5 text-gray-300 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {item.categories?.name || '-'}
                                    </span>
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                                            item.visibility === 'public'
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-yellow-500/10 text-yellow-400'
                                        }`}
                                    >
                                        {item.visibility || 'Public'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-base sm:text-lg line-clamp-2 sm:truncate mb-1">{item.title}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Eye size={12} /> {item.view_count || 0}
                                    </span>
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleTogglePin(item, e)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-amber-400 transition-colors z-10"
                                    title={item.is_pinned ? 'Lepas Pin' : 'Pin ke Beranda'}
                                >
                                    {item.is_pinned ? <PinOff size={18} /> : <Pin size={18} />}
                                </button>
                                <button
                                    onClick={(e) => handleEdit(item, e)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors z-10"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => handleResetStats(item, e)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors z-10"
                                    title="Reset Statistik"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(item.id, e)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors z-10"
                                    title="Hapus"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Edit Media' : 'Tambah Media Baru'}
            >
                <MediaForm
                    initialData={editingItem || undefined}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        fetchMedia();
                    }}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Modal>

            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Media">
                {viewingItem && (
                    <div className="space-y-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50">
                            <img
                                src={viewingItem.thumbnail_url}
                                alt={viewingItem.title}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute top-4 right-4">
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        viewingItem.visibility === 'public'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-yellow-500 text-black'
                                    }`}
                                >
                                    {viewingItem.visibility === 'public' ? 'Public' : 'Private'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-2">{viewingItem.title}</h2>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {viewingItem.media_types?.name}
                                </span>
                                <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs">
                                    {viewingItem.categories?.name}
                                </span>
                                <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs">
                                    {viewingItem.levels?.name || 'Semua Jenjang'}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed bg-white/5 p-4 rounded-xl">
                                {viewingItem.description || 'Tidak ada deskripsi'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white/5 p-4 rounded-xl">
                                <div className="text-gray-500 mb-1">Total Views</div>
                                <div className="text-xl font-bold">{viewingItem.view_count || 0}</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl">
                                <div className="text-gray-500 mb-1">Total Unduhan</div>
                                <div className="text-xl font-bold">{viewingItem.download_count || 0}</div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={(e) => handleResetStats(viewingItem, e)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={16} /> Reset Statistik
                            </button>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Tutup
                            </button>
                            <a
                                href={
                                    viewingItem.source_type === 'link'
                                        ? viewingItem.external_url || viewingItem.file_url
                                        : viewingItem.file_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex items-center gap-2"
                            >
                                <Eye size={16} /> {viewingItem.source_type === 'link' ? 'Buka Link' : 'Lihat File'}
                            </a>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
