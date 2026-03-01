import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getR2ObjectAccessUrl } from '@/lib/r2';
import { getAdminSession } from '@/lib/auth';

function parseBigIntId(value: string): bigint | null {
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const objectId = parseBigIntId(id);
    if (!objectId) {
        return NextResponse.json({ success: false, error: 'Invalid object id' }, { status: 400 });
    }

    try {
        const mode = request.nextUrl.searchParams.get('mode');
        const object = await prisma.storage_objects.findUnique({
            where: { id: objectId },
            select: {
                id: true,
                bucket: true,
                object_key: true,
                learning_media_file_object: {
                    where: {
                        visibility: {
                            equals: 'public',
                            mode: 'insensitive',
                        },
                    },
                    select: { id: true },
                    take: 1,
                },
                learning_media_thumbnail_object: {
                    where: {
                        visibility: {
                            equals: 'public',
                            mode: 'insensitive',
                        },
                    },
                    select: { id: true },
                    take: 1,
                },
                institutions_logo_object: {
                    select: { id: true },
                    take: 1,
                },
                institutions_favicon_object: {
                    select: { id: true },
                    take: 1,
                },
                institutions_og_image_object: {
                    select: { id: true },
                    take: 1,
                },
            },
        });

        if (!object) {
            return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
        }

        const isPublicAsset =
            object.learning_media_file_object.length > 0 ||
            object.learning_media_thumbnail_object.length > 0 ||
            object.institutions_logo_object.length > 0 ||
            object.institutions_favicon_object.length > 0 ||
            object.institutions_og_image_object.length > 0;

        if (!isPublicAsset) {
            const session = await getAdminSession(request);
            if (!session) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized to access this file' },
                    { status: 401 }
                );
            }
        }

        const signedUrl = await getR2ObjectAccessUrl(object.bucket, object.object_key);

        if (mode === 'proxy') {
            const upstream = await fetch(signedUrl, {
                method: 'GET',
                redirect: 'follow',
                cache: 'no-store',
            });

            if (!upstream.ok) {
                return NextResponse.json(
                    { success: false, error: `Upstream fetch failed (${upstream.status})` },
                    { status: upstream.status }
                );
            }

            const headers = new Headers();
            const contentType = upstream.headers.get('content-type');
            const contentLength = upstream.headers.get('content-length');
            const contentDisposition = upstream.headers.get('content-disposition');

            if (contentType) headers.set('Content-Type', contentType);
            if (contentLength) headers.set('Content-Length', contentLength);
            if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
            if (isPublicAsset) {
                headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
            } else {
                headers.set('Cache-Control', 'private, no-store');
            }

            if (upstream.body) {
                return new NextResponse(upstream.body, {
                    status: 200,
                    headers,
                });
            }

            const fallbackBuffer = await upstream.arrayBuffer();
            return new NextResponse(fallbackBuffer, {
                status: 200,
                headers,
            });
        }

        const response = NextResponse.redirect(signedUrl, { status: 302 });
        if (isPublicAsset) {
            response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        } else {
            response.headers.set('Cache-Control', 'private, no-store');
        }
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
