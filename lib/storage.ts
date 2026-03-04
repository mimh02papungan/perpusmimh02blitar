import { supabase } from './supabase';
// import { supabaseAdmin } from './supabaseAdmin'; // Removed for client safety

// Supported file types and their MIME types
export const SUPPORTED_FILE_TYPES = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',

    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',

    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',

    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
};

export function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !SUPPORTED_FILE_TYPES[fileExt as keyof typeof SUPPORTED_FILE_TYPES]) {
        return {
            valid: false,
            error: `Tipe file tidak didukung. File yang didukung: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}`
        };
    }

    return { valid: true };
}

export function getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';

    // Videos
    if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) return 'video';

    // Audio
    if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';

    // Documents
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';

    // Archives
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';

    return 'file';
}

export async function uploadToStorage(
    file: File,
    bucket: string = 'media',
    path?: string
) {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return {
        url: publicUrl,
        path: filePath,
        bucket,
        fileType: getFileType(file.name)
    };
}

export async function deleteFromStorage(path: string, bucket: string = 'media') {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Storage delete error:', error);
        throw error;
    }
}

export function getPublicUrl(path: string, bucket: string = 'media') {
    // If it's already a URL, return it
    if (path?.startsWith('http')) return path;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
}

export function extractPathFromUrl(url: string, bucket: string = 'media'): string | null {
    if (!url?.includes('supabase')) return null;

    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
        return pathParts[1] || null;
    } catch {
        return null;
    }
}
