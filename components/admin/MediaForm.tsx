'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface Option {
    id: number;
    name: string;
}

interface MediaFormInitialData {
    id: number;
    title: string;
    description: string | null;
    category_id: number;
    level_id: number;
    media_type_id: number;
    visibility: string | null;
    file_object_id?: string | null;
    thumbnail_object_id?: string | null;
    source_type?: string | null;
    external_url?: string | null;
    is_pinned?: boolean | null;
}

interface MediaFormProps {
    initialData?: MediaFormInitialData;
    onSuccess: () => void;
    onCancel: () => void;
}

function detectLinkTypeName(typeName: string | null | undefined): boolean {
    if (!typeName) return false;
    return typeName.trim().toLowerCase().includes('link');
}

function isValidHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export default function MediaForm({ initialData, onSuccess, onCancel }: MediaFormProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Option[]>([]);
    const [levels, setLevels] = useState<Option[]>([]);
    const [types, setTypes] = useState<Option[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category_id: '',
        level_id: '',
        media_type: '',
        visibility: 'public',
        source_type: 'file' as 'file' | 'link',
        external_url: '',
        is_pinned: false,
    });

    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);

    const selectedMediaTypeName = useMemo(() => {
        const selected = types.find((item) => String(item.id) === formData.media_type);
        return selected?.name || null;
    }, [types, formData.media_type]);

    const isLinkMode = formData.source_type === 'link' || detectLinkTypeName(selectedMediaTypeName);

    useEffect(() => {
        fetch('/api/categories', { method: 'POST' })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setCategories(data.filters.categories || []);
                    setLevels(data.filters.levels || []);
                    setTypes(data.filters.mediaTypes || []);
                }
            });

        if (initialData) {
            const initialSourceType =
                initialData.source_type && initialData.source_type.toLowerCase() === 'link'
                    ? 'link'
                    : 'file';

            setFormData({
                title: initialData.title,
                description: initialData.description || '',
                category_id: initialData.category_id ? String(initialData.category_id) : '',
                level_id: initialData.level_id ? String(initialData.level_id) : '',
                media_type: initialData.media_type_id ? String(initialData.media_type_id) : '',
                visibility: initialData.visibility || 'public',
                source_type: initialSourceType,
                external_url: initialData.external_url || '',
                is_pinned: Boolean(initialData.is_pinned),
            });
        }
    }, [initialData]);

    const uploadFileObject = async (selectedFile: File, folder: 'media' | 'thumbnails') => {
        const uploadForm = new FormData();
        uploadForm.append('file', selectedFile);
        uploadForm.append('folder', folder);

        const uploadRes = await fetch('/api/admin/upload', {
            method: 'POST',
            body: uploadForm,
        });
        const uploadJson = await uploadRes.json();

        if (!uploadRes.ok || !uploadJson.success) {
            throw new Error(uploadJson.error || 'Upload file gagal');
        }

        return String(uploadJson.data.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.category_id || !formData.level_id || !formData.media_type) {
                throw new Error('Kategori, jenjang, dan tipe media wajib diisi');
            }

            if (isLinkMode && !isValidHttpUrl(formData.external_url.trim())) {
                throw new Error('URL link wajib valid (http/https)');
            }

            if (initialData) {
                const initialFileObjectId =
                    initialData.file_object_id !== undefined && initialData.file_object_id !== null
                        ? String(initialData.file_object_id)
                        : null;
                const initialThumbnailObjectId =
                    initialData.thumbnail_object_id !== undefined && initialData.thumbnail_object_id !== null
                        ? String(initialData.thumbnail_object_id)
                        : null;

                let nextFileObjectId = initialFileObjectId;
                let nextThumbnailObjectId = initialThumbnailObjectId;

                if (!isLinkMode && file) {
                    nextFileObjectId = await uploadFileObject(file, 'media');
                }

                if (thumbnail) {
                    nextThumbnailObjectId = await uploadFileObject(thumbnail, 'thumbnails');
                } else if (
                    !isLinkMode &&
                    file &&
                    initialFileObjectId &&
                    initialThumbnailObjectId &&
                    initialFileObjectId === initialThumbnailObjectId
                ) {
                    nextThumbnailObjectId = nextFileObjectId;
                }

                if (!isLinkMode && !nextFileObjectId) {
                    throw new Error('File utama wajib diisi untuk media bertipe file');
                }

                const updateBody: Record<string, unknown> = {
                    title: formData.title,
                    description: formData.description,
                    category_id: Number.parseInt(formData.category_id, 10),
                    level_id: Number.parseInt(formData.level_id, 10),
                    media_type_id: Number.parseInt(formData.media_type, 10),
                    visibility: formData.visibility,
                    source_type: isLinkMode ? 'link' : 'file',
                    external_url: isLinkMode ? formData.external_url.trim() : null,
                    is_pinned: formData.is_pinned,
                };

                if (isLinkMode) {
                    updateBody.file_object_id = null;
                } else if (nextFileObjectId) {
                    updateBody.file_object_id = nextFileObjectId;
                }

                if (nextThumbnailObjectId) {
                    updateBody.thumbnail_object_id = nextThumbnailObjectId;
                }

                const res = await fetch(`/api/admin/media/${initialData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateBody),
                });

                if (!res.ok) {
                    const json = await res.json().catch(() => null);
                    throw new Error(json?.error || 'Update failed');
                }
            } else {
                if (!isLinkMode && !file) {
                    throw new Error('File utama wajib diunggah untuk media bertipe file');
                }
                if (isLinkMode && !thumbnail) {
                    throw new Error('Thumbnail/foto wajib diunggah untuk media bertipe link');
                }

                const data = new FormData();
                data.append('title', formData.title);
                data.append('description', formData.description);
                data.append('category_id', formData.category_id);
                data.append('level_id', formData.level_id);
                data.append('media_type_id', formData.media_type);
                data.append('visibility', formData.visibility);
                data.append('source_type', isLinkMode ? 'link' : 'file');
                data.append('external_url', isLinkMode ? formData.external_url.trim() : '');
                data.append('is_pinned', formData.is_pinned ? 'true' : 'false');

                if (!isLinkMode && file) {
                    data.append('file', file);
                }

                if (thumbnail) {
                    data.append('thumbnail', thumbnail);
                }

                const res = await fetch('/api/admin/media/upload', {
                    method: 'POST',
                    body: data,
                });

                const json = await res.json();
                if (!json.success) throw new Error(json.message || json.error || 'Upload gagal');
            }

            onSuccess();
        } catch (error: unknown) {
            console.error('Submit error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Gagal menyimpan data: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Judul</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Kategori</label>
                        <select
                            required
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="">Pilih Kategori</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id} className="text-black">
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Jenjang</label>
                        <select
                            required
                            value={formData.level_id}
                            onChange={(e) => setFormData({ ...formData, level_id: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="">Pilih Jenjang</option>
                            {levels.map((l) => (
                                <option key={l.id} value={l.id} className="text-black">
                                    {l.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Tipe Media</label>
                        <select
                            required
                            value={formData.media_type}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                const selectedType = types.find((item) => String(item.id) === selectedValue);
                                const autoLink = detectLinkTypeName(selectedType?.name);

                                setFormData({
                                    ...formData,
                                    media_type: selectedValue,
                                    source_type: autoLink ? 'link' : formData.source_type,
                                });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="">Pilih Tipe</option>
                            {types.map((t) => (
                                <option key={t.id} value={t.id} className="text-black">
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Sumber Media</label>
                        <select
                            value={isLinkMode ? 'link' : formData.source_type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    source_type: e.target.value === 'link' ? 'link' : 'file',
                                })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="file" className="text-black">
                                File
                            </option>
                            <option value="link" className="text-black">
                                Link
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Visibilitas</label>
                        <select
                            value={formData.visibility}
                            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                        >
                            <option value="public" className="text-black">
                                Publik
                            </option>
                            <option value="private" className="text-black">
                                Private
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            {isLinkMode && (
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Link Tujuan</label>
                    <input
                        type="url"
                        required
                        placeholder="https://contoh.com/media"
                        value={formData.external_url}
                        onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                    />
                </div>
            )}

            <div>
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-purple-500 outline-none"
                />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-300">
                <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="accent-purple-500"
                />
                Pin media ini agar tampil di beranda
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm font-medium mb-1">
                        {isLinkMode
                            ? 'File Utama Tidak Diperlukan (Mode Link)'
                            : initialData
                                ? 'Ganti File Media'
                                : 'Upload File Media *'}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                        Video, Foto, PDF, Excel, DOC, ZIP (Max 500MB)
                    </p>
                    <input
                        type="file"
                        required={!initialData && !isLinkMode}
                        disabled={isLinkMode}
                        accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 disabled:opacity-50"
                    />
                    {file && (
                        <p className="text-xs text-green-400 mt-2">
                            File: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm font-medium mb-1">
                        {initialData ? 'Ganti Thumbnail' : isLinkMode ? 'Upload Foto/Thumbnail *' : 'Upload Thumbnail'}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">Gambar Preview</p>
                    <input
                        type="file"
                        required={!initialData && isLinkMode}
                        accept="image/*"
                        onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"
                    />
                    {thumbnail && <p className="text-xs text-green-400 mt-2">Thumbnail: {thumbnail.name}</p>}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && <Loader2 className="animate-spin w-4 h-4" />}
                    {initialData ? 'Simpan Perubahan' : 'Upload Media'}
                </button>
            </div>
        </form>
    );
}
