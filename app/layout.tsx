import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { prisma } from '@/lib/prisma';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';
import PwaRegistration from '@/components/PwaRegistration';
import WebPushPrompt from '@/components/WebPushPrompt';

const DEFAULT_TITLE = 'Perpustakaan Digital MI MIFTAHUL HUDA';
const DEFAULT_DESCRIPTION = 'Platform perpustakaan digital modern dengan koleksi buku lengkap';
const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

function parseKeywords(raw: string | null | undefined) {
  if (!raw) return undefined;
  const keywords = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return keywords.length > 0 ? keywords : undefined;
}

function normalizeOgType(raw: string | null | undefined): 'website' | 'article' {
  return raw?.toLowerCase() === 'article' ? 'article' : 'website';
}

function normalizeTwitterCard(raw: string | null | undefined): 'summary' | 'summary_large_image' {
  return raw === 'summary' ? 'summary' : 'summary_large_image';
}

function parseUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

const THEME_INIT_SCRIPT = `
(() => {
  try {
    const key = 'theme-preference';
    const stored = localStorage.getItem(key);
    const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const theme = stored === 'light' || stored === 'dark' ? stored : system;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  }
})();
`;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const institutionRaw = await prisma.institutions.findFirst({
      orderBy: { created_at: 'desc' },
      include: {
        favicon_object: { select: { bucket: true, object_key: true } },
        og_image_object: { select: { bucket: true, object_key: true } },
      },
    });
    const institution = institutionRaw ? mapInstitutionWithStorageUrls(institutionRaw) : null;

    const title =
      (institution?.seo_title as string | null) ||
      (institution?.name as string | null) ||
      DEFAULT_TITLE;
    const institutionName = (institution?.name as string | null) || DEFAULT_TITLE;
    const description =
      (institution?.seo_description as string | null) ||
      (institution?.description as string | null) ||
      DEFAULT_DESCRIPTION;
    const keywords = parseKeywords(institution?.seo_keywords as string | null);
    const canonical = (institution?.canonical_url as string | null) || undefined;
    const ogType = normalizeOgType(institution?.og_type as string | null);
    const twitterCard = normalizeTwitterCard(institution?.twitter_card as string | null);
    const ogImage = (institution?.og_image_url as string | null) || undefined;
    const iconUrl = (institution?.favicon_url as string | null) || '/favicon.ico';
    const metadataBase = parseUrl(canonical) || parseUrl(FALLBACK_SITE_URL);

    return {
      title,
      description,
      applicationName: institutionName,
      keywords,
      manifest: '/manifest.json',
      metadataBase,
      alternates: canonical ? { canonical } : undefined,
      openGraph: {
        title,
        description,
        type: ogType,
        siteName: institutionName,
        url: canonical || undefined,
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: twitterCard,
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
      icons: {
        icon: iconUrl,
      },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      manifest: '/manifest.json',
      metadataBase: parseUrl(FALLBACK_SITE_URL),
      icons: {
        icon: '/favicon.ico',
      },
    };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <PwaRegistration />
        <WebPushPrompt />
        {children}
      </body>
    </html>
  );
}
