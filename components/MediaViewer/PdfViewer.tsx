'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, FileText, Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

type ScrollMode = 'vertical' | 'horizontal';

interface PdfViewerProps {
    fileUrl: string;
    title?: string;
    scrollMode?: ScrollMode;
}

export default function PdfViewer({ fileUrl, title, scrollMode = 'vertical' }: PdfViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [renderWidth, setRenderWidth] = useState(900);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

    useEffect(() => {
        const target = viewerRef.current;
        if (!target) return;

        const updateWidth = () => {
            const width = target.clientWidth;
            if (!width) return;
            const base = scrollMode === 'horizontal'
                ? Math.max(280, Math.min(Math.floor(width * 0.72), 980))
                : Math.max(280, width - 64);
            setRenderWidth(base);
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(target);
        return () => observer.disconnect();
    }, [scrollMode]);

    useEffect(() => {
        const pageNode = pageRefs.current[currentPage - 1];
        if (!pageNode) return;
        pageNode.scrollIntoView({
            behavior: 'smooth',
            inline: scrollMode === 'horizontal' ? 'center' : 'nearest',
            block: 'start',
        });
    }, [currentPage, scrollMode]);

    const effectiveWidth = useMemo(() => {
        const width = Math.floor(renderWidth * zoom);
        return Math.max(260, Math.min(width, 2400));
    }, [renderWidth, zoom]);

    const resolvedFileUrl = useMemo(() => {
        if (!fileUrl.startsWith('/api/storage/object/')) return fileUrl;
        const separator = fileUrl.includes('?') ? '&' : '?';
        return `${fileUrl}${separator}mode=proxy`;
    }, [fileUrl]);

    const pages = Array.from({ length: numPages }, (_, index) => index + 1);

    const canPrev = currentPage > 1;
    const canNext = currentPage < numPages;

    return (
        <div className="w-full h-full bg-black/90 flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/70">
                <div className="min-w-0 flex items-center gap-2 text-gray-200">
                    <FileText className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium truncate" title={title || 'PDF'}>
                        {title || 'PDF'}
                    </span>
                    {numPages > 0 && (
                        <span className="text-[11px] text-gray-400">
                            {currentPage}/{numPages}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Perkecil"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-[11px] sm:text-xs min-w-[50px] text-center text-gray-200">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(2))))}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Perbesar"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom(1)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Reset zoom"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            <div
                ref={viewerRef}
                className={`flex-1 overflow-auto bg-[#0a0a0a] ${
                    scrollMode === 'horizontal' ? 'px-4 py-6' : 'px-3 py-6 sm:px-6'
                }`}
            >
                <Document
                    key={resolvedFileUrl}
                    file={resolvedFileUrl}
                    loading={
                        <div className="h-full min-h-[240px] flex items-center justify-center text-gray-300 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Memuat dokumen...</span>
                        </div>
                    }
                    onLoadSuccess={(pdf) => {
                        setNumPages(pdf.numPages);
                        setCurrentPage(1);
                        setErrorMessage(null);
                    }}
                    onLoadError={(error) => {
                        setErrorMessage(error.message || 'Gagal memuat PDF');
                    }}
                    error={
                        <div className="h-full min-h-[240px] flex items-center justify-center text-red-300 px-4 text-center">
                            <p className="text-sm">{errorMessage || 'Dokumen tidak dapat ditampilkan'}</p>
                        </div>
                    }
                >
                    {numPages > 0 && (
                        <div
                            className={`${
                                scrollMode === 'horizontal'
                                    ? 'flex items-start gap-5 min-w-max'
                                    : 'flex flex-col items-center gap-6'
                            }`}
                        >
                            {pages.map((pageNumber, index) => (
                                <div
                                    key={pageNumber}
                                    ref={(node) => {
                                        pageRefs.current[index] = node;
                                    }}
                                    className="shadow-2xl shadow-black/40 bg-white"
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        width={effectiveWidth}
                                        renderTextLayer
                                        renderAnnotationLayer
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Document>
            </div>

            {numPages > 1 && (
                <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-white/10 bg-black/70">
                    <button
                        type="button"
                        onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                        disabled={!canPrev}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
                    >
                        <ChevronLeft size={14} />
                        Prev
                    </button>
                    <span className="text-xs text-gray-300 min-w-[70px] text-center">
                        Hal. {currentPage} / {numPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setCurrentPage((value) => Math.min(numPages, value + 1))}
                        disabled={!canNext}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
                    >
                        Next
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
