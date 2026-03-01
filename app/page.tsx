import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { mapMediaWithStorageUrls, mapInstitutionWithStorageUrls } from '@/lib/mappers';

export const revalidate = 300;

export default async function HomePage() {
  const [pinnedRaw, latestRaw, institutionRaw] = await Promise.all([
    prisma.learning_media.findMany({
      where: { visibility: 'public', is_pinned: true },
      orderBy: [{ pinned_at: 'desc' }, { created_at: 'desc' }],
      take: 6,
      include: {
        categories: { select: { name: true } },
        media_types: { select: { name: true, icon: true } },
        levels: { select: { name: true } },
        file_object: { select: { bucket: true, object_key: true } },
        thumbnail_object: { select: { bucket: true, object_key: true } },
      },
    }),
    prisma.learning_media.findMany({
      where: { visibility: 'public' },
      orderBy: { created_at: 'desc' },
      take: 6,
      include: {
        categories: { select: { name: true } },
        media_types: { select: { name: true, icon: true } },
        levels: { select: { name: true } },
        file_object: { select: { bucket: true, object_key: true } },
        thumbnail_object: { select: { bucket: true, object_key: true } },
      },
    }),
    prisma.institutions.findFirst({
      orderBy: { created_at: 'desc' },
      select: {
        name: true,
        logo_url: true,
        logo_object_id: true,
        logo_object: {
          select: {
            bucket: true,
            object_key: true,
          },
        },
      },
    }),
  ]);
  const pinnedMedia = pinnedRaw.map(mapMediaWithStorageUrls);
  const latestMedia = latestRaw
    .map(mapMediaWithStorageUrls)
    .slice(0, 6);
  const institution = institutionRaw ? mapInstitutionWithStorageUrls(institutionRaw) : null;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Hero Content */}
            <div className="flex flex-col items-center justify-center animate-fade-in-up">
              {/* 1. Logo */}
              <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center overflow-hidden mb-8">
                {institution?.logo_url ? (
                  <Image
                    src={institution.logo_url}
                    alt="Logo"
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 128px, 160px"
                    unoptimized={institution.logo_url.startsWith('/api/storage/object/')}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">M</span>
                  </div>
                )}
              </div>

              {/* 2. Text "Perpustakaan Digital" */}
              <h2 className="text-2xl md:text-3xl font-light tracking-widest uppercase mb-4 text-gray-300">
                Perpustakaan Digital
              </h2>

              {/* 3. Institution Name */}
              <h1
                className="text-4xl md:text-5xl lg:text-7xl font-bold text-center leading-tight gradient-text"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {institution?.name || 'Nama Institusi Belum Diatur'}
              </h1>
            </div>
          </div>

          <div className="absolute top-40 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] -z-10"></div>
        </div>
      </section>

      {/* Pin Learning Media */}
      <section className="container mx-auto px-6 py-20">
        {pinnedMedia.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {pinnedMedia.map((item, index) => (
              <MediaCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-gray-500">Belum ada media yang dipin.</p>
          </div>
        )}
      </section>

      {/* Koleksi Terbaru */}
      <section className="container mx-auto px-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Koleksi <span className="gradient-text">Terbaru</span>
            </h2>
          </div>
          <Link href="/categories" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all">
            Lihat Semua
          </Link>
        </div>

        {latestMedia.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {latestMedia.map((item, index) => (
              <MediaCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-gray-500">Belum ada koleksi terbaru.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

type HomeMediaItem = {
  id: number;
  title: string;
  thumbnail_url: string;
  file_url: string;
  source_type: string | null;
  external_url: string | null;
  is_pinned: boolean | null;
  view_count: number | null;
  categories: { name: string } | null;
  media_types: { name: string; icon: string | null } | null;
  levels: { name: string } | null;
};

function MediaCard({ item, index }: { item: HomeMediaItem; index: number }) {
  const isLink = item.source_type === 'link';
  const href = isLink ? item.external_url || item.file_url : `/detail/${item.id}`;

  const cardBody = (
    <>
      <div className="aspect-[3/4] relative overflow-hidden">
        <Image
          src={item.thumbnail_url}
          alt={item.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized={item.thumbnail_url.startsWith('/api/storage/object/')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {item.media_types?.name || 'Media'}
          </span>
        </div>
        {item.is_pinned && (
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 bg-amber-500/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-black">
              Pinned
            </span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <span>{item.categories?.name}</span>
        </div>
        <h3 className="text-lg font-bold line-clamp-2 group-hover:text-purple-400 transition-colors">
          {item.title}
        </h3>
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <span>{item.levels?.name}</span>
          <span>{item.view_count || 0} views</span>
        </div>
      </div>
    </>
  );

  if (isLink) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group relative flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {cardBody}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {cardBody}
    </Link>
  );
}
