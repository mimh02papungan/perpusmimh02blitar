'use client';

import { FileArchive, FileSpreadsheet, FileText } from 'lucide-react';
import DownloadButton from './DownloadButton';

interface DocumentViewerProps {
    fileUrl: string;
    title: string;
    fileType?: string;
    mediaId?: number;
}

function getFileExtension(fileUrl: string) {
    const cleanUrl = fileUrl.split('?')[0].split('#')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';
    return ext;
}

function getFileTypeName(ext: string) {
    const typeMap: Record<string, string> = {
        doc: 'Microsoft Word',
        docx: 'Microsoft Word',
        xls: 'Microsoft Excel',
        xlsx: 'Microsoft Excel',
        ppt: 'Microsoft PowerPoint',
        pptx: 'Microsoft PowerPoint',
        txt: 'Text Document',
        zip: 'ZIP Archive',
        rar: 'RAR Archive',
        '7z': '7-Zip Archive',
    };
    return typeMap[ext] || 'Document';
}

function getFileIcon(ext: string) {
    if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className="w-16 h-16 text-green-500" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-16 h-16 text-purple-500" />;
    return <FileText className="w-16 h-16 text-blue-500" />;
}

export default function DocumentViewer({
    fileUrl,
    title,
    fileType = 'document',
    mediaId,
}: DocumentViewerProps) {
    const extension = getFileExtension(fileUrl);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-900 to-black p-8 text-slate-50">
            <div className="text-center max-w-2xl">
                <div className="mb-6 flex justify-center">{getFileIcon(extension)}</div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-slate-200 text-lg mb-1">{getFileTypeName(extension)}</p>
                    <p className="text-slate-300 text-sm">{extension.toUpperCase()} File</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6 text-left">
                    <h3 className="font-semibold text-blue-300 mb-1">Preview tidak tersedia</h3>
                    <p className="text-sm text-slate-200">
                        File ini tidak dapat dipreview langsung. Silakan unduh file asli untuk membukanya
                        menggunakan aplikasi yang sesuai.
                    </p>
                </div>

                <div className="flex justify-center">
                    {mediaId ? (
                        <DownloadButton
                            mediaId={mediaId}
                            fileUrl={fileUrl}
                            fileName={title}
                            mediaType={fileType}
                        />
                    ) : (
                        <a
                            href={fileUrl}
                            download={title}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                        >
                            Download File
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
