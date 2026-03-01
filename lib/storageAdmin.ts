import { supabaseAdmin } from './supabaseAdmin';
import { validateFile, getFileType } from './storage';

export async function uploadToStorageAdmin(
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

    const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return {
        url: publicUrl,
        path: filePath,
        bucket,
        fileType: getFileType(file.name)
    };
}

export async function deleteFromStorageAdmin(path: string, bucket: string = 'media') {
    const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Storage delete error:', error);
        throw error;
    }
}
