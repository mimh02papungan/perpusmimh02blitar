import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const fallback: MetadataRoute.Manifest = {
        name: 'Perpustakaan Digital',
        short_name: 'Perpus',
        description: 'Platform perpustakaan digital modern',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#111827',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };

    try {
        const institutionRaw = await prisma.institutions.findFirst({
            orderBy: { created_at: 'desc' },
            include: {
                favicon_object: { select: { bucket: true, object_key: true } },
            },
        });
        const institution = institutionRaw ? mapInstitutionWithStorageUrls(institutionRaw) : null;

        const name = institution?.name || fallback.name;
        const shortName = institution?.name ? institution.name.slice(0, 20) : fallback.short_name;
        const description =
            (institution?.seo_description as string | null) ||
            (institution?.description as string | null) ||
            fallback.description;
        const icon = (institution?.favicon_url as string | null) || '/favicon.ico';

        return {
            ...fallback,
            name,
            short_name: shortName,
            description,
            icons: [
                {
                    src: icon,
                    sizes: 'any',
                    type: icon.endsWith('.png') ? 'image/png' : 'image/x-icon',
                },
            ],
        };
    } catch {
        return fallback;
    }
}
