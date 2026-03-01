import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth';
import { uploadObjectToR2 } from '@/lib/r2';
import { assertStorageQuota, createStorageObject, mapStorageObject } from '@/lib/storageObjects';

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = String(formData.get('folder') || formData.get('path') || 'uploads');

        const normalizedFolder = folder.toLowerCase().replace(/\\/g, '/').split('/')[0];
        const superadminOnlyFolders = new Set(['logo', 'favicon', 'ogimage']);
        if (superadminOnlyFolders.has(normalizedFolder) && auth.session.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Folder ini hanya boleh diakses superadmin' },
                { status: 403 }
            );
        }

        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: 'File is required' },
                { status: 400 }
            );
        }

        if (file.size > MAX_UPLOAD_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file melebihi batas 500MB' },
                { status: 400 }
            );
        }

        await assertStorageQuota(file.size);

        const arrayBuffer = await file.arrayBuffer();
        const upload = await uploadObjectToR2({
            data: Buffer.from(arrayBuffer),
            contentType: file.type || undefined,
            folder,
            filename: file.name,
        });

        const storageObject = await createStorageObject({
            bucket: upload.bucket,
            objectKey: upload.objectKey,
            mimeType: file.type || null,
            sizeBytes: file.size,
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

