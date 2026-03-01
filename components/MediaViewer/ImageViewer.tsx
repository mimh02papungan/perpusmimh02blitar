// components/MediaViewer/ImageViewer.tsx
'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

interface ImageViewerProps {
    fileUrl: string;
    title: string;
}

export default function ImageViewer({ fileUrl, title }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-black">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
            </div>

            {/* Image Display */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-gray-900">
                <img
                    src={fileUrl}
                    alt={title}
                    style={{
                        transform: `scale(${scale})`,
                        transition: 'transform 0.2s ease',
                    }}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                />
            </div>
        </div>
    );
}