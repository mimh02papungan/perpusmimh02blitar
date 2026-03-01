'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
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
  Home,
  Search,
  LayoutGrid,
  Shapes,
  GraduationCap,
} from 'lucide-react';

// Map icon Lucide untuk sosial media
const socialIconMap = {
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

interface Institution {
  name: string;
  logo_url?: string;
}

interface SocialLink {
  id: string;
  icon: string;
  link: string;
  name: string;
}

export default function Footer() {
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
    <footer className="border-t border-white/10 mt-16 md:mt-20 bg-black/20">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          
          {/* BAGIAN 1: Logo & Nama + Sosial Media */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              {institution?.logo_url && (
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-white/5 shrink-0">
                  <Image
                    src={institution.logo_url} 
                    alt="Logo" 
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    sizes="48px"
                    unoptimized={institution.logo_url.startsWith('/api/storage/object/')}
                  />
                </div>
              )}
              <h3 className="text-xl md:text-2xl font-bold gradient-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                {institution?.name || 'Perpustakaan Digital'}
              </h3>
            </div>

            {/* Ikon Sosial Media Saja */}
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <SocialIconButton key={link.id} href={link.link} icon={link.icon} />
              ))}
            </div>
          </div>

          {/* BAGIAN 2: Quick Links (Vertikal) */}
          <div>
            <h4 className="font-semibold mb-4 text-white text-sm md:text-base">Menu Navigasi</h4>
            <div className="flex flex-col gap-2">
              <FooterNavLink href="/" icon={<Home size={18} />}>Beranda</FooterNavLink>
              <FooterNavLink href="/search" icon={<Search size={18} />}>Daftar Media</FooterNavLink>
              <FooterNavLink href="/categories" icon={<LayoutGrid size={18} />}>Kategori</FooterNavLink>
              <FooterNavLink href="/categories/jenis-media" icon={<Shapes size={18} />}>Jenis Media</FooterNavLink>
              <FooterNavLink href="/categories/tingkatan" icon={<GraduationCap size={18} />}>Tingkatan</FooterNavLink>
            </div>
          </div>

          {/* BAGIAN 3: Kontak Kami */}
          <div>
            <h4 className="font-semibold mb-4 text-white text-sm md:text-base">Bantuan</h4>
            <div className="flex flex-col gap-2">
              <FooterNavLink href="/contact" icon={<Mail size={18} />}>Kontak Kami</FooterNavLink>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 text-center text-gray-400 text-xs md:text-sm">
          <p>&copy; 2026 {institution?.name || 'Perpustakaan Digital'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Komponen Ikon Sosial Media
function SocialIconButton({ href, icon }: { href: string; icon: string }) {
  const IconComponent = socialIconMap[icon as keyof typeof socialIconMap] || Globe;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-3 rounded-xl bg-white/5 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 text-gray-300 hover:text-white transition-all duration-300 border border-white/5"
    >
      <IconComponent size={20} />
    </a>
  );
}

// Komponen NavLink Vertikal
function FooterNavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 w-fit"
    >
      <span className="text-purple-400">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
