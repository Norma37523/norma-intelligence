import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';

const BUCKET = 'uploads';

/**
 * Upload a file's bytes to Supabase Storage and return the storage path.
 *
 * Path layout:  <company_id>/<upload_id>/<filename>
 * The bucket is private — access is mediated by signed URLs from server code.
 */
export async function putUploadFile(args: {
  companyId: string;
  uploadId: string;
  filename: string;
  contentType: string;
  bytes: ArrayBuffer | Uint8Array;
}): Promise<{ path: string }> {
  const supabase = await createSupabaseServerClient();

  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${args.companyId}/${args.uploadId}/${safeName}`;

  const body =
    args.bytes instanceof Uint8Array
      ? args.bytes
      : new Uint8Array(args.bytes as ArrayBuffer);

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: args.contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path };
}

export async function getUploadBytes(path: string): Promise<Uint8Array> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteUploadFile(path: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export const UPLOADS_BUCKET = BUCKET;
