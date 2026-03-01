import { buildStorageObjectAccessPath } from '@/lib/r2';

type StorageReference = {
    bucket: string;
    object_key: string;
} | null;

type MediaInput = {
    file_url: string;
    thumbnail_url: string;
    file_object?: StorageReference;
    thumbnail_object?: StorageReference;
    file_object_id?: bigint | null;
    thumbnail_object_id?: bigint | null;
    [key: string]: unknown;
};

type InstitutionInput = {
    logo_url: string | null;
    logo_object?: StorageReference;
    favicon_object?: StorageReference;
    og_image_object?: StorageReference;
    logo_object_id?: bigint | null;
    favicon_object_id?: bigint | null;
    og_image_object_id?: bigint | null;
    [key: string]: unknown;
};

type AdminInput = {
    foto_url: string | null;
    foto_object?: StorageReference;
    foto_object_id?: bigint | null;
    [key: string]: unknown;
};

export function mapMediaWithStorageUrls<T extends MediaInput>(item: T) {
    const fileUrl = item.file_object_id
        ? buildStorageObjectAccessPath(item.file_object_id)
        : item.file_url;
    const thumbnailUrl = item.thumbnail_object_id
        ? buildStorageObjectAccessPath(item.thumbnail_object_id)
        : item.thumbnail_url || fileUrl;

    return {
        ...item,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        file_object: undefined,
        thumbnail_object: undefined,
        file_object_id:
            item.file_object_id !== undefined && item.file_object_id !== null
                ? item.file_object_id.toString()
                : null,
        thumbnail_object_id:
            item.thumbnail_object_id !== undefined && item.thumbnail_object_id !== null
                ? item.thumbnail_object_id.toString()
                : null,
    };
}

export function mapInstitutionWithStorageUrls<T extends InstitutionInput>(item: T) {
    return {
        ...item,
        logo_url: item.logo_object_id
            ? buildStorageObjectAccessPath(item.logo_object_id)
            : item.logo_url,
        favicon_url: item.favicon_object_id
            ? buildStorageObjectAccessPath(item.favicon_object_id)
            : null,
        og_image_url: item.og_image_object_id
            ? buildStorageObjectAccessPath(item.og_image_object_id)
            : null,
        logo_object: undefined,
        favicon_object: undefined,
        og_image_object: undefined,
        logo_object_id:
            item.logo_object_id !== undefined && item.logo_object_id !== null
                ? item.logo_object_id.toString()
                : null,
        favicon_object_id:
            item.favicon_object_id !== undefined && item.favicon_object_id !== null
                ? item.favicon_object_id.toString()
                : null,
        og_image_object_id:
            item.og_image_object_id !== undefined && item.og_image_object_id !== null
                ? item.og_image_object_id.toString()
                : null,
    };
}

export function mapAdminWithStorageUrls<T extends AdminInput>(item: T) {
    return {
        ...item,
        foto_url: item.foto_object_id
            ? buildStorageObjectAccessPath(item.foto_object_id)
            : item.foto_url,
        foto_object: undefined,
        foto_object_id:
            item.foto_object_id !== undefined && item.foto_object_id !== null
                ? item.foto_object_id.toString()
                : null,
    };
}
