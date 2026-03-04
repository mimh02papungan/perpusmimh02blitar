import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { uploadObjectToR2 } from '@/lib/r2';
import { assertStorageQuota, createStorageObject, mapStorageObject } from '@/lib/storageObjects';

function decodeHeaderValue(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const contentType = String(request.headers.get('content-type') || '');
        const isMultipart = contentType.toLowerCase().includes('multipart/form-data');

        let folder = 'uploads';
        let filename = 'file.bin';
        let mimeType: string | null = null;
        let buffer: Buffer | null = null;

        if (isMultipart) {
            const formData = await request.formData();
            const file = formData.get('file');
            folder = String(formData.get('folder') || formData.get('path') || 'uploads');

            if (!(file instanceof File)) {
                return NextResponse.json(
                    { success: false, error: 'File is required' },
                    { status: 400 }
                );
            }

            filename = String(file.name || filename);
            mimeType = file.type || null;
            buffer = Buffer.from(await file.arrayBuffer());
        } else {
            // Raw upload mode: Body is binary file, metadata via headers.
            // This avoids multipart parsing issues in some environments.
            folder = String(
                request.headers.get('x-upload-folder') ||
                    request.headers.get('x-folder') ||
                    'uploads'
            );
            const encodedFilename = String(
                request.headers.get('x-upload-filename') ||
                    request.headers.get('x-filename') ||
                    filename
            );
            filename = decodeHeaderValue(encodedFilename) || filename;
            mimeType = contentType || null;

            const arrayBuffer = await request.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        const normalizedFolder = folder.toLowerCase().replace(/\\/g, '/').split('/')[0];
        const superadminOnlyFolders = new Set(['logo', 'favicon', 'ogimage']);
        if (superadminOnlyFolders.has(normalizedFolder) && auth.session.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Folder ini hanya boleh diakses superadmin' },
                { status: 403 }
            );
        }

        if (normalizedFolder === 'favicon') {
            const lower = String(filename || '').toLowerCase();
            if (!lower.endsWith('.ico')) {
                return NextResponse.json(
                    { success: false, error: 'Favicon harus berformat .ico' },
                    { status: 400 }
                );
            }
        }

        if (!buffer) {
            return NextResponse.json(
                { success: false, error: 'File is required' },
                { status: 400 }
            );
        }

        await assertStorageQuota(buffer.length);
        const upload = await uploadObjectToR2({
            data: buffer,
            contentType: mimeType || undefined,
            folder,
            filename,
        });

        const storageObject = await createStorageObject({
            bucket: upload.bucket,
            objectKey: upload.objectKey,
            mimeType: mimeType || null,
            sizeBytes: buffer.length,
            etag: upload.etag,
            isPublic: false,
        });

        const mapped = mapStorageObject(storageObject);
        return NextResponse.json({
            success: true,
            data: {
                ...mapped,
                access_url: mapped.access_url,
                public_url: mapped.public_url,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

