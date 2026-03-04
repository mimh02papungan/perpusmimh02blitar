'use client';

import { useEffect, useState } from 'react';
import {
    Save,
    AlertCircle,
    CheckCircle,
    Upload,
    Plus,
    Edit2,
    Trash2,
    Globe,
} from 'lucide-react';
import { Instagram, Youtube, Facebook, Twitter, Linkedin, Github, Phone, Mail } from 'lucide-react';
import Modal from '@/components/Modal';

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
};

type SocialIconKey = keyof typeof socialIconMap;

interface InstitutionSettings {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    og_image_url: string | null;
    logo_object_id: string | null;
    favicon_object_id: string | null;
    og_image_object_id: string | null;
    seo_title: string | null;
    seo_description: string | null;
    seo_keywords: string | null;
    canonical_url: string | null;
    og_type: string | null;
    twitter_card: string | null;
}

interface SocialLink {
    id: string;
    name: string;
    link: string;
    icon: string;
}

interface UploadResult {
    id: string;
    access_url: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'web' | 'social'>('web');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [institution, setInstitution] = useState<InstitutionSettings | null>(null);
    const [webForm, setWebForm] = useState({
        name: '',
        description: '',
        seo_title: '',
        seo_description: '',
        seo_keywords: '',
        canonical_url: '',
        og_type: 'website',
        twitter_card: 'summary_large_image',
        logo_object_id: null as string | null,
        favicon_object_id: null as string | null,
        og_image_object_id: null as string | null,
    });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
    const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);

    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
    const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
    const [socialForm, setSocialForm] = useState({ name: '', link: '', icon: 'website' });

    const showError = (text: string) => setMessage({ type: 'error', text });
    const showSuccess = (text: string) => setMessage({ type: 'success', text });

    const fetchInstitution = async () => {
        const res = await fetch('/api/admin/institution');
        const json = await res.json();
        if (!json.success || !json.data?.length) return;
        const data = json.data[0] as InstitutionSettings;
        setInstitution(data);
        setWebForm({
            name: data.name || '',
            description: data.description || '',
            seo_title: data.seo_title || '',
            seo_description: data.seo_description || '',
            seo_keywords: data.seo_keywords || '',
            canonical_url: data.canonical_url || '',
            og_type: data.og_type || 'website',
            twitter_card: data.twitter_card || 'summary_large_image',
            logo_object_id: data.logo_object_id || null,
            favicon_object_id: data.favicon_object_id || null,
            og_image_object_id: data.og_image_object_id || null,
        });
        setLogoPreview(data.logo_url || null);
        setFaviconPreview(data.favicon_url || null);
        setOgImagePreview(data.og_image_url || null);
    };

    const fetchSocialLinks = async () => {
        const res = await fetch('/api/admin/social-links');
        const json = await res.json();
        if (json.success) setSocialLinks(json.data || []);
    };

    useEffect(() => {
        setMessage(null);
        if (activeTab === 'web') {
            fetchInstitution().catch((err) => showError(String(err)));
        }
        if (activeTab === 'social') {
            fetchSocialLinks().catch((err) => showError(String(err)));
        }
    }, [activeTab]);

    const uploadFile = async (file: File, folder: string): Promise<UploadResult> => {
        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'x-upload-folder': folder,
                'x-upload-filename': encodeURIComponent(file.name || 'file.bin'),
            },
            body: file,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.error || 'Upload gagal');
        }

        return {
            id: String(json.data.id),
            access_url: String(json.data.access_url || json.data.public_url || ''),
        };
    };

    const handleWebSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let logoObjectId = webForm.logo_object_id;
            let faviconObjectId = webForm.favicon_object_id;
            let ogImageObjectId = webForm.og_image_object_id;

            if (logoFile) {
                const upload = await uploadFile(logoFile, 'logo');
                logoObjectId = upload.id;
                setLogoPreview(upload.access_url);
            }
            if (faviconFile) {
                const upload = await uploadFile(faviconFile, 'favicon');
                faviconObjectId = upload.id;
                setFaviconPreview(upload.access_url);
            }
            if (ogImageFile) {
                const upload = await uploadFile(ogImageFile, 'ogimage');
                ogImageObjectId = upload.id;
                setOgImagePreview(upload.access_url);
            }

            const payload = {
                name: webForm.name,
                description: webForm.description,
                logo_object_id: logoObjectId,
                favicon_object_id: faviconObjectId,
                og_image_object_id: ogImageObjectId,
                seo_title: webForm.seo_title,
                seo_description: webForm.seo_description,
                seo_keywords: webForm.seo_keywords,
                canonical_url: webForm.canonical_url,
                og_type: webForm.og_type,
                twitter_card: webForm.twitter_card,
            };

            const url = institution ? `/api/admin/institution/${institution.id}` : '/api/admin/institution';
            const method = institution ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal menyimpan pengaturan web');
            }

            setLogoFile(null);
            setFaviconFile(null);
            setOgImageFile(null);
            showSuccess('Pengaturan web berhasil disimpan');
            await fetchInstitution();
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingSocial ? `/api/admin/social-links/${editingSocial.id}` : '/api/admin/social-links';
            const method = editingSocial ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(socialForm),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal menyimpan social link');
            }
            setIsSocialModalOpen(false);
            setEditingSocial(null);
            setSocialForm({ name: '', link: '', icon: 'website' });
            fetchSocialLinks();
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Gagal menyimpan social link');
        }
    };

    const deleteSocial = async (id: string) => {
        if (!confirm('Hapus link sosial media ini?')) return;
        try {
            const res = await fetch(`/api/admin/social-links/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal menghapus social link');
            }
            fetchSocialLinks();
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Gagal menghapus social link');
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Pengaturan Superadmin</h1>
                <p className="text-gray-400">Kelola branding web, SEO, dan social media</p>
            </div>

            <div className="flex gap-2 mb-8 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('web')}
                    className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'web' ? 'border-purple-500 text-purple-400 font-medium' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Pengaturan Web
                </button>
                <button
                    onClick={() => setActiveTab('social')}
                    className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'social' ? 'border-purple-500 text-purple-400 font-medium' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Social Media
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p>{message.text}</p>
                </div>
            )}

            {activeTab === 'web' && (
                <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
                    <form onSubmit={handleWebSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <UploadCard
                                label="Logo Web"
                                preview={logoPreview}
                                onFileChange={setLogoFile}
                                hint="Dipakai di header, sidebar, footer."
                            />
                            <UploadCard
                                label="Favicon"
                                preview={faviconPreview}
                                accept=".ico,image/x-icon,image/vnd.microsoft.icon"
                                onFileChange={(file) => {
                                    if (!file) {
                                        setFaviconFile(null);
                                        return;
                                    }
                                    const filename = file.name.toLowerCase();
                                    if (!filename.endsWith('.ico')) {
                                        showError('Favicon harus berformat .ico');
                                        setFaviconFile(null);
                                        return;
                                    }
                                    setFaviconFile(file);
                                }}
                                hint="Dipakai di tab browser. Wajib berformat .ico."
                            />
                            <UploadCard
                                label="OG Image"
                                preview={ogImagePreview}
                                onFileChange={setOgImageFile}
                                hint="Dipakai untuk preview sosial media."
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Title Web (institution.name)</label>
                            <input
                                type="text"
                                required
                                value={webForm.name}
                                onChange={(e) => setWebForm({ ...webForm, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">SEO Title (opsional)</label>
                            <input
                                type="text"
                                value={webForm.seo_title}
                                onChange={(e) => setWebForm({ ...webForm, seo_title: e.target.value })}
                                placeholder="Jika kosong, memakai institution.name"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Deskripsi Institusi</label>
                            <textarea
                                rows={3}
                                value={webForm.description}
                                onChange={(e) => setWebForm({ ...webForm, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">SEO Description</label>
                                <textarea
                                    rows={3}
                                    value={webForm.seo_description}
                                    onChange={(e) => setWebForm({ ...webForm, seo_description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">SEO Keywords</label>
                                <textarea
                                    rows={3}
                                    value={webForm.seo_keywords}
                                    onChange={(e) => setWebForm({ ...webForm, seo_keywords: e.target.value })}
                                    placeholder="contoh: perpustakaan digital, mi, media pembelajaran"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Canonical URL</label>
                                <input
                                    type="url"
                                    value={webForm.canonical_url}
                                    onChange={(e) => setWebForm({ ...webForm, canonical_url: e.target.value })}
                                    placeholder="https://domain-kamu.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">OpenGraph Type</label>
                                <select
                                    value={webForm.og_type}
                                    onChange={(e) => setWebForm({ ...webForm, og_type: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                                >
                                    <option value="website">website</option>
                                    <option value="article">article</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Twitter Card</label>
                                <select
                                    value={webForm.twitter_card}
                                    onChange={(e) => setWebForm({ ...webForm, twitter_card: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                                >
                                    <option value="summary_large_image">summary_large_image</option>
                                    <option value="summary">summary</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <span>Menyimpan...</span> : <><Save size={18} /><span>Simpan Pengaturan Web</span></>}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'social' && (
                <div>
                    <button
                        onClick={() => {
                            setEditingSocial(null);
                            setSocialForm({ name: '', link: '', icon: 'website' });
                            setIsSocialModalOpen(true);
                        }}
                        className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium flex items-center gap-2"
                    >
                        <Plus size={18} /> <span>Tambah Social Link</span>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {socialLinks.map((link) => {
                            const Icon = socialIconMap[link.icon as SocialIconKey] || Globe;
                            return (
                                <div key={link.id} className="bg-[#1a1a1a] border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{link.name}</h4>
                                            <p className="text-xs text-gray-400 truncate max-w-[150px]">{link.link}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => {
                                            setEditingSocial(link);
                                            setSocialForm({ name: link.name, link: link.link, icon: link.icon });
                                            setIsSocialModalOpen(true);
                                        }} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit2 size={16} /></button>
                                        <button onClick={() => deleteSocial(link.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Modal isOpen={isSocialModalOpen} onClose={() => setIsSocialModalOpen(false)} title={editingSocial ? 'Edit Social Link' : 'Tambah Social Link'}>
                <form onSubmit={handleSocialSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Platform</label>
                        <select
                            value={socialForm.icon}
                            onChange={(e) => setSocialForm({ ...socialForm, icon: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none appearance-none"
                        >
                            {Object.keys(socialIconMap).map((key) => (
                                <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Nama Tampilan</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Instagram Sekolah"
                            value={socialForm.name}
                            onChange={(e) => setSocialForm({ ...socialForm, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Link</label>
                        <input
                            type="text"
                            required
                            placeholder="https://..."
                            value={socialForm.link}
                            onChange={(e) => setSocialForm({ ...socialForm, link: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsSocialModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-white/5">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium">{editingSocial ? 'Simpan' : 'Tambah'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function UploadCard({
    label,
    preview,
    onFileChange,
    hint,
    accept,
}: {
    label: string;
    preview: string | null;
    onFileChange: (file: File | null) => void;
    hint: string;
    accept?: string;
}) {
    return (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <p className="text-sm text-gray-300 mb-3">{label}</p>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 mb-3 bg-black/40 flex items-center justify-center">
                {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xs text-gray-500">Belum ada file</span>
                )}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                <Upload size={14} />
                Upload
                <input
                    type="file"
                    accept={accept || 'image/*'}
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
            </label>
            <p className="text-xs text-gray-500 mt-2">{hint}</p>
        </div>
    );
}

