'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpDown, Maximize2, Minimize2 } from 'lucide-react';
import PdfViewer from './PdfViewer';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';
import DownloadButton from './DownloadButton';

type ViewerType =
    | 'pdf'
    | 'video'
    | 'audio'
    | 'image'
    | 'document'
    | 'spreadsheet'
    | 'presentation'
    | 'archive'
    | 'unknown';

type ScrollMode = 'vertical' | 'horizontal';

interface MediaViewerProps {
    fileUrl: string;
    mediaId: number;
    mediaType: string;
    title: string;
}

function getFileTypeFromUrl(url: string): ViewerType {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'avi', 'mov', 'mkv', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'unknown';
}

function normalizeMediaType(mediaType: string): ViewerType {
    const normalized = mediaType.toLowerCase().trim();

    if (normalized.includes('video')) return 'video';
    if (normalized.includes('audio')) return 'audio';
    if (
        normalized.includes('gambar') ||
        normalized.includes('image') ||
        normalized.includes('foto')
    ) {
        return 'image';
    }
    if (normalized.includes('pdf')) return 'pdf';
    if (
        normalized.includes('dokumen') ||
        normalized.includes('document') ||
        normalized.includes('word')
    ) {
        return 'document';
    }
    if (normalized.includes('excel') || normalized.includes('spreadsheet')) return 'spreadsheet';
    if (normalized.includes('presentasi') || normalized.includes('presentation') || normalized.includes('ppt')) {
        return 'presentation';
    }
    if (normalized.includes('arsip') || normalized.includes('archive') || normalized.includes('zip')) {
        return 'archive';
    }
    return 'unknown';
}

export default function MediaViewer({
    fileUrl,
    mediaId,
    mediaType,
    title,
}: MediaViewerProps) {
    const [error, setError] = useState<string | null>(null);
    const [scrollMode, setScrollMode] = useState<ScrollMode>('vertical');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const viewerContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const viewerType = useMemo<ViewerType>(() => {
        const fromType = normalizeMediaType(mediaType);
        if (fromType !== 'unknown') return fromType;
        return getFileTypeFromUrl(fileUrl);
    }, [mediaType, fileUrl]);

    const supportsScrollMode = viewerType === 'pdf';

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await viewerContainerRef.current?.requestFullscreen();
                return;
            }
            await document.exitFullscreen();
        } catch (fullscreenError) {
            console.error('Fullscreen error:', fullscreenError);
        }
    };

    const renderViewer = () => {
        try {
            switch (viewerType) {
                case 'pdf':
                    return <PdfViewer fileUrl={fileUrl} title={title} scrollMode={scrollMode} />;
                case 'video':
                    return <VideoPlayer fileUrl={fileUrl} title={title} />;
                case 'audio':
                    return <AudioPlayer fileUrl={fileUrl} title={title} />;
                case 'image':
                    return <ImageViewer fileUrl={fileUrl} title={title} />;
                case 'document':
                case 'spreadsheet':
                case 'presentation':
                case 'archive':
                    return (
                        <DocumentViewer
                            fileUrl={fileUrl}
                            title={title}
                            fileType={viewerType}
                            mediaId={mediaId}
                        />
                    );
                default:
                    return (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 rounded-xl">
                            <div className="text-center p-8">
                                <div className="text-5xl mb-4">FILE</div>
                                <p className="text-gray-300 mb-6">
                                    Format tidak didukung untuk preview: <strong>{mediaType}</strong>
                                </p>
                                <DownloadButton
                                    mediaId={mediaId}
                                    fileUrl={fileUrl}
                                    fileName={title}
                                    mediaType={mediaType}
                                />
                            </div>
                        </div>
                    );
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            return (
                <div className="flex items-center justify-center h-full bg-red-900/20 rounded-xl">
                    <div className="text-center p-8">
                        <div className="text-5xl mb-4">ERROR</div>
                        <p className="text-red-400 mb-2 font-medium">Error loading media</p>
                        <p className="text-sm text-gray-300 mb-6">{error || 'Unexpected viewer error'}</p>
                        <DownloadButton
                            mediaId={mediaId}
                            fileUrl={fileUrl}
                            fileName={title}
                            mediaType={mediaType}
                        />
                    </div>
                </div>
            );
        }
    };

    const controlsPositionClass = viewerType === 'pdf' ? 'top-14 sm:top-16 right-2 sm:right-3' : 'top-2 sm:top-3 right-2 sm:right-3';

    return (
        <div ref={viewerContainerRef} className="relative w-full h-full bg-black rounded-xl overflow-hidden">
            <div className={`absolute ${controlsPositionClass} z-30 flex flex-col sm:flex-row items-end gap-2 max-w-[calc(100%-0.75rem)]`}>
                {supportsScrollMode && (
                    <button
                        type="button"
                        onClick={() =>
                            setScrollMode((value) => (value === 'vertical' ? 'horizontal' : 'vertical'))
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 text-[11px] sm:text-xs text-white hover:bg-black/85 transition-colors whitespace-nowrap shrink-0"
                        title={scrollMode === 'vertical' ? 'Ubah ke scroll horizontal' : 'Ubah ke scroll vertical'}
                    >
                        {scrollMode === 'vertical' ? <ArrowLeftRight size={14} /> : <ArrowUpDown size={14} />}
                        <span className="hidden sm:inline">{scrollMode === 'vertical' ? 'Horizontal' : 'Vertical'}</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-black/70 border border-white/15 text-white hover:bg-black/85 transition-colors shrink-0"
                    title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
                    aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>
            {renderViewer()}
        </div>
    );
}
