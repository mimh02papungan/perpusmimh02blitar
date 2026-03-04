'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Filter,
} from 'lucide-react';

type BrowseMode = 'category' | 'media_type' | 'level';

interface MediaItem {
    id: number;
    title: string;
    description: string;
    thumbnail_url: string;
    file_url: string;
    source_type?: string | null;
    external_url?: string | null;
    download_count: number;
    view_count: number;
    created_at: string;
    levels: { id: number; name: string };
    categories: { id: number; name: string };
    media_types: { id: number; name: string; icon: string };
}

interface FilterOption {
    id: number;
    name: string;
    icon?: string | null;
}

const MODE_CONFIG: Record<
    BrowseMode,
    {
        title: string;
        description: string;
        label: string;
    }
> = {
    category: {
        title: 'Kategori Media Pembelajaran',
        description: 'Temukan materi pembelajaran berdasarkan kategori.',
        label: 'Kategori',
    },
    media_type: {
        title: 'Jenis Media Pembelajaran',
        description: 'Temukan materi pembelajaran berdasarkan jenis media.',
        label: 'Jenis Media',
    },
    level: {
        title: 'Tingkatan Media Pembelajaran',
        description: 'Temukan materi pembelajaran berdasarkan tingkatan/jenjang.',
        label: 'Tingkatan',
    },
};

export default function PublicBrowsePage({ mode }: { mode: BrowseMode }) {
    const router = useRouter();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<FilterOption[]>([]);
    const [levels, setLevels] = useState<FilterOption[]>([]);
    const [mediaTypes, setMediaTypes] = useState<FilterOption[]>([]);
    const [selectedFilter, setSelectedFilter] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const config = MODE_CONFIG[mode];
    const activeFilters = mode === 'category' ? categories : mode === 'media_type' ? mediaTypes : levels;

    useEffect(() => {
        async function fetchFilters() {
            try {
                const res = await fetch('/api/categories', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    setCategories(data.filters.categories || []);
                    setLevels(data.filters.levels || []);
                    setMediaTypes(data.filters.mediaTypes || []);
                }
            } catch (error) {
                console.error('Error fetching filters:', error);
            }
        }

        fetchFilters();
    }, []);

    useEffect(() => {
        async function fetchMedia() {
            setLoading(true);
            const params = new URLSearchParams({
                category: mode === 'category' ? selectedFilter : 'all',
                media_type: mode === 'media_type' ? selectedFilter : 'all',
                level: mode === 'level' ? selectedFilter : 'all',
                page: String(currentPage),
            });

            try {
                const res = await fetch(`/api/categories?${params}`);
                const data = await res.json();
                if (data.success) {
                    setMedia(data.data || []);
                    setTotalPages(data.pagination?.totalPages || 1);
                    setTotalItems(data.pagination?.total || 0);
                } else {
                    setMedia([]);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setMedia([]);
            } finally {
                setLoading(false);
            }
        }

        fetchMedia();
    }, [mode, selectedFilter, currentPage]);

    const handleMediaClick = (item: MediaItem) => {
        if (item.source_type === 'link' && (item.external_url || item.file_url)) {
            window.open(item.external_url || item.file_url, '_blank', 'noopener,noreferrer');
            return;
        }
        router.push(`/detail/${item.id}`);
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

    return (
        <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <div className="mb-12 text-center">
                    <h1
                        className="text-4xl md:text-6xl font-bold gradient-text mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {config.title}
                    </h1>
                    <p className="text-gray-400 text-lg max-w-3xl mx-auto text-center md:text-justify">
                        {config.description}
                    </p>
                </div>

                <div className="glass-card p-6 rounded-3xl mb-12 border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <Filter size={20} className="text-[var(--app-accent)]" />
                        <h2 className="text-xl font-bold">Filter Media</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-medium">{config.label}</label>
                            <select
                                value={selectedFilter}
                                onChange={(e) => {
                                    setSelectedFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="public-filter-select w-full p-4 rounded-xl outline-none transition-all cursor-pointer"
                            >
                                <option value="all" className="public-filter-option">
                                    Semua {config.label}
                                </option>
                                {activeFilters.map((item) => (
                                    <option key={item.id} value={item.id} className="public-filter-option">
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!loading && (
                        <div className="mt-4 text-sm text-gray-400">
                            Menampilkan {media.length} dari {totalItems} media
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="h-[34rem] bg-white/5 animate-pulse rounded-3xl" />
                        ))}
                    </div>
                ) : media.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <div className="text-6xl mb-4">Tidak ada media</div>
                        <h3 className="text-xl font-bold mb-2">Tidak ada media ditemukan</h3>
                        <p className="text-gray-500">Coba ubah filter pencarian Anda</p>
                    </div>
                ) : (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {media.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    whileHover={{ y: -10 }}
                                    onClick={() => handleMediaClick(item)}
                                    className="glass-card group rounded-3xl overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500/50 transition-all"
                                >
                                    <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
                                        <Image
                                            src={item.thumbnail_url}
                                            alt={item.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            unoptimized={item.thumbnail_url.startsWith('/api/storage/object/')}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                        <div className="absolute top-3 right-3">
                                            <span className="bg-purple-600 text-slate-50 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                                {item.media_types.icon} {item.media_types.name}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="text-[10px] font-bold text-[var(--app-accent)] uppercase tracking-widest mb-2">
                                            {item.categories.name}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--app-accent)] transition-colors line-clamp-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-400 text-sm text-justify line-clamp-2 mb-4">
                                            {item.description}
                                        </p>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Eye size={14} />
                                                {item.view_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Download size={14} />
                                                {item.download_count}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs pt-4 border-t border-white/10">
                                            <span className="flex items-center gap-2 text-gray-400">
                                                <BookOpen size={14} />
                                                {item.levels.name}
                                            </span>
                                            <span className="text-gray-500">{formatDate(item.created_at)}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {totalPages > 1 && !loading && (
                    <div className="mt-12 flex justify-center items-center gap-6">
                        <button
                            onClick={() => {
                                setCurrentPage((value) => value - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === 1}
                            className="p-3 bg-white/5 rounded-xl border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-600 hover:border-purple-600 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-2">
                            {[...Array(totalPages)].map((_, index) => {
                                const pageNum = index + 1;
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => {
                                                setCurrentPage(pageNum);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                                currentPage === pageNum
                                                    ? 'bg-purple-600 text-slate-50'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                }
                                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return (
                                        <span key={pageNum} className="text-gray-500">
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => {
                                setCurrentPage((value) => value + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === totalPages}
                            className="p-3 bg-white/5 rounded-xl border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-600 hover:border-purple-600 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
