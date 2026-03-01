import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';

const DEFAULT_TITLE = 'Admin Panel';
const DEFAULT_DESCRIPTION = 'Halaman Administrator';

export async function generateMetadata(): Promise<Metadata> {
    try {
        const institutionRaw = await prisma.institutions.findFirst({
            orderBy: { created_at: 'desc' },
            include: {
                favicon_object: { select: { bucket: true, object_key: true } },
            },
        });

        const institution = institutionRaw ? mapInstitutionWithStorageUrls(institutionRaw) : null;
        const title = institution?.name
            ? `Admin Panel - ${institution.name as string}`
            : DEFAULT_TITLE;
        const description =
            (institution?.seo_description as string | null) ||
            (institution?.description as string | null) ||
            DEFAULT_DESCRIPTION;
        const iconUrl = (institution?.favicon_url as string | null) || '/favicon.ico';

        return {
            title,
            description,
            icons: {
                icon: iconUrl,
            },
            robots: {
                index: false,
                follow: false,
            },
        };
    } catch {
        return {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            robots: {
                index: false,
                follow: false,
            },
            icons: {
                icon: '/favicon.ico',
            },
        };
    }
}

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
            {children}
        </div>
    );
}
