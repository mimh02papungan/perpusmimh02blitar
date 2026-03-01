// components/MediaViewer/DownloadButton.tsx
'use client';

import { useState } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';

interface DownloadButtonProps {
    mediaId: number;
    fileUrl: string;
    fileName: string;
    mediaType?: string;
    className?: string;
}

export default function DownloadButton({
    mediaId,
    fileUrl,
    fileName,
    mediaType = 'raw',
    className = '',
}: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleDownload = async () => {
        setIsDownloading(true);
        setStatus('idle');

        try {
            // 1. Track download via API (increment counter)
            const trackResponse = await fetch(`/api/media/${mediaId}/download?source=detail`, {
                method: 'POST',
            });

            const trackData = await trackResponse.json();

            if (!trackData.success) {
                console.warn('Failed to track download, but continuing...');
            }

            // 2. Open file URL directly (avoid CORS/fetch issues on signed/private storage URLs)
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Download error:', error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${status === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : status === 'error'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {isDownloading ? (
                <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    <span>Downloading...</span>
                </>
            ) : status === 'success' ? (
                <>
                    <CheckCircle size={20} />
                    <span>Downloaded!</span>
                </>
            ) : status === 'error' ? (
                <>
                    <AlertCircle size={20} />
                    <span>Failed</span>
                </>
            ) : (
                <>
                    <Download size={20} />
                    <span>Download</span>
                </>
            )}
        </button>
    );
}
