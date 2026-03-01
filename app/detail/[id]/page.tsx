// app/(pages)/detail/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DownloadButton from '@/components/MediaViewer/DownloadButton';
import { Eye, Download, Calendar, BookOpen, Tag } from 'lucide-react';

interface MediaViewerProps {
    fileUrl: string;
    mediaId: number;
    mediaType: string;
    title: string;
}

const MediaViewer = dynamic(() => import('@/components/MediaViewer'), {
    ssr: false,
    loading: () => (
        <div className="h-[800px] flex items-center justify-center bg-[#1a1a1a] rounded-2xl">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Memuat viewer...</p>
            </div>
        </div>
    ),
}) as React.ComponentType<MediaViewerProps>;

interface MediaData {
    id: number;
    title: string;
    description: string;
    thumbnail_url: string;
    file_url: string;
    view_count: number;
    download_count: number;
    created_at: string;
    source_type?: string | null;
    external_url?: string | null;
    levels: { id: number; name: string };
    categories: { id: number; name: string };
    media_types: { id: number; name: string; icon: string };
}

export default function DetailPage() {
    const { id } = useParams();
    const [data, setData] = useState<MediaData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // First, increment view count
                fetch(`/api/media/${id}/view?source=detail`, { method: 'POST' });

                const res = await fetch(`/api/media/${id}`);
                const json = await res.json();

                if (json.success) {
                    setData(json.data);
                    if (json.data?.source_type === 'link' && (json.data?.external_url || json.data?.file_url)) {
                        window.location.href = json.data.external_url || json.data.file_url;
                    }
                } else {
                    console.error('Failed to load media:', json.message);
                }
            } catch (error) {
                console.error('Error fetching media:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex items-center justify-center transition-colors">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Memuat media...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col transition-colors">
                <Header />
                <main className="flex-grow flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">😕</div>
                        <h2 className="text-2xl font-bold mb-2">Media tidak ditemukan</h2>
                        <p className="text-gray-400">
                            Media yang Anda cari tidak tersedia
                        </p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col transition-colors">
            <Header />

            <main className="flex-grow pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Thumbnail */}
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                            <Image
                                src={data.thumbnail_url}
                                alt={data.title}
                                width={360}
                                height={480}
                                className="w-full h-full object-cover"
                                sizes="(max-width: 1024px) 100vw, 25vw"
                                unoptimized={data.thumbnail_url.startsWith('/api/storage/object/')}
                            />
                        </div>

                        {/* Title & Description */}
                        <div>
                            <h1 className="text-2xl font-bold mb-3">{data.title}</h1>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {data.description}
                            </p>
                        </div>

                        {/* Meta Info */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3 text-gray-400">
                                <Tag size={16} className="text-purple-400" />
                                <span>
                                    {data.categories?.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400">
                                <BookOpen size={16} className="text-purple-400" />
                                <span>{data.levels?.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400">
                                <Calendar size={16} className="text-purple-400" />
                                <span>{formatDate(data.created_at)}</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                    <Eye size={14} />
                                    <span>Views</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {data.view_count}
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                    <Download size={14} />
                                    <span>Downloads</span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {data.download_count}
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <DownloadButton
                            mediaId={data.id}
                            fileUrl={data.file_url}
                            fileName={data.title}
                            mediaType={data.media_types?.name || 'File'}
                            className="w-full"
                        />
                    </div>

                    {/* Media Viewer */}
                    <div className="lg:col-span-3">
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[800px]">
                            <MediaViewer
                                fileUrl={data.file_url}
                                mediaId={data.id}
                                mediaType={data.media_types?.name || 'File'}
                                title={data.title}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
