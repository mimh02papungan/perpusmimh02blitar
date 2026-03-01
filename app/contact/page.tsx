'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Github,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';

export const socialIconMap = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
  whatsapp: Phone,
  email: Mail,
  website: Globe,
} as const;

export type SocialIconName = keyof typeof socialIconMap;

interface Institution {
  name: string;
  logo_url?: string;
  description?: string;
}

interface SocialLink {
  id: string;
  icon: string;
  link: string;
  name: string;
}

export default function ContactPage() {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    fetch('/api/institution')
      .then((res) => res.json())
      .then(setInstitution);

    fetch('/api/social-links')
      .then((res) => res.json())
      .then(setSocialLinks);
  }, []);

  return (
    // min-h-screen dan w-full memastikan div ini menutupi seluruh body globals.css
    // Flex-col dan justify-between memastikan Footer terdorong ke paling bawah jika konten sedikit
    <div className="flex flex-col min-h-screen w-full bg-[var(--app-bg)] text-[var(--app-text)] transition-colors selection:bg-purple-500/30">
      <Header />
      
      {/* Main Content Area - grow agar mengisi sisa layar */}
      <main className="flex-grow flex flex-col items-center justify-start pt-32 pb-20 px-4 md:px-6">
        <div className="max-w-3xl w-full flex flex-col gap-12">

          {/* ATAS - Rata Tengah & Logo Besar */}
          <section className="flex flex-col items-center text-center animate-fade-in-up">
            {institution?.logo_url && (
              <div className="mb-8 relative group">
                {/* Glow effect di belakang logo */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                
                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl bg-black">
                  <Image
                    src={institution.logo_url} 
                    alt="Logo Institusi" 
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 160px, 192px"
                    unoptimized={institution.logo_url.startsWith('/api/storage/object/')}
                  />
                </div>
              </div>
            )}
            
            <h1
              className="text-2xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {institution?.name || 'MI Miftahul Huda 02 Papungan'}
            </h1>
            
            <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl">
              {institution?.description ||
                'Sekolah dasar Islam yang berkomitmen untuk pendidikan berkualitas dan pengembangan karakter siswa.'}
            </p>
          </section>

          {/* BAWAH - Kartu Kontak */}
          <section className="glass-card p-6 md:p-10 rounded-3xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-xl md:text-2xl font-semibold mb-8 text-center md:text-left">
              Informasi Kontak
            </h3>

            {socialLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {socialLinks.map((link) => (
                  <SocialLinkItem
                    key={link.id}
                    href={link.link}
                    icon={link.icon}
                    name={link.name}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center italic">Tidak ada kontak tersedia saat ini.</p>
            )}
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}

function SocialLinkItem({
  href,
  icon,
  name,
}: {
  href: string;
  icon: string;
  name: string;
}) {
  const IconComponent = socialIconMap[icon as SocialIconName] || Globe;
  const compactUrl = href.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 group"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
        <IconComponent size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm md:text-base font-medium text-gray-300 group-hover:text-white truncate">{name}</p>
        <p className="text-[11px] md:text-xs text-gray-500 truncate">{compactUrl}</p>
      </div>
    </a>
  );
}
