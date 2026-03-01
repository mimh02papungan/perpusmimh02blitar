// Path: app/(pages)/search/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Search, ChevronLeft, ChevronRight, BookOpen, Eye, Download } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface SearchMediaItem {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string;
  file_url: string;
  source_type?: string | null;
  external_url?: string | null;
  view_count: number | null;
  download_count: number | null;
  categories: { id: number; name: string } | null;
  media_types: { id: number; name: string; icon: string | null } | null;
  levels: { id: number; name: string } | null;
}

export default function MediaListPage() {
  const router = useRouter();
  const [media, setMedia] = useState<SearchMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        search: search,
        page: page.toString()
      });
      
      try {
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        if (data.success) {
          setMedia(data.data);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch media", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 400);
    return () => clearTimeout(debounce);
  }, [search, page]);

  // ALL media go to detail page
  const handleMediaClick = (item: SearchMediaItem) => {
    if (item.source_type === 'link' && (item.external_url || item.file_url)) {
      window.open(item.external_url || item.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(`/detail/${item.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <Header />
      
      <main className="flex-grow pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6 gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            E-Library Media
          </motion.h1>
          
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-400" size={22} />
            <input 
              type="text"
              placeholder="Cari materi pembelajaran (contoh: Matematika)..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/10 transition-all text-lg shadow-2xl"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[34rem] bg-white/5 animate-pulse rounded-3xl border border-white/5" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <Search size={48} className="mx-auto mb-4" />
            <p className="text-xl">Tidak ada media yang ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {media.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -8 }}
                  onClick={() => handleMediaClick(item)}
                  className="glass-card group rounded-3xl overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500/50 transition-all bg-white/[0.02]"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <Image
                      src={item.thumbnail_url} 
                      alt={item.title} 
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={item.thumbnail_url.startsWith('/api/storage/object/')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <span className="text-sm font-bold bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                        Lihat Detail
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {item.media_types?.icon} {item.media_types?.name}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        {item.categories?.name}
                      </span>
                      <span className="text-gray-500 text-[10px]">•</span>
                      <span className="text-gray-400 text-[10px] font-bold flex items-center gap-1">
                        <BookOpen size={10} /> {item.levels?.name}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-3 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-500 text-sm line-clamp-2 mb-5">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-gray-500 text-xs">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1"><Eye size={14} /> {item.view_count}</span>
                        <span className="flex items-center gap-1"><Download size={14} /> {item.download_count}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-4">
            <button 
              disabled={page === 1}
              onClick={() => { setPage(p => p - 1); window.scrollTo(0,0); }}
              className="p-4 bg-white/5 rounded-2xl disabled:opacity-20 hover:bg-purple-600 transition-all border border-white/10"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold">
              {page} <span className="text-gray-500 mx-2">/</span> {pagination.totalPages}
            </div>
            <button 
              disabled={page === pagination.totalPages}
              onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }}
              className="p-4 bg-white/5 rounded-2xl disabled:opacity-20 hover:bg-purple-600 transition-all border border-white/10"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
