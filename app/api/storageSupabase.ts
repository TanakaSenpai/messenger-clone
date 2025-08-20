import { supabase } from "app/configs/supabase";
import * as FileSystem from "expo-file-system";

export type MediaKind = "image" | "video";

function getExtFromUri(uri: string): string {
  const q = uri.split("?")[0];
  const dot = q.lastIndexOf(".");
  return dot >= 0 ? q.slice(dot + 1).toLowerCase() : "jpg";
}

function mimeFromExt(ext: string, kind: MediaKind): string {
  if (kind === "image") {
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "heic") return "image/heic";
    return "image/jpeg";
  }
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return "application/octet-stream";
}

export const BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_BUCKET || process.env.SUPABASE_BUCKET || "conversations";

export async function uploadFileFromUriSupabase(opts: {
  fileUri: string;
  kind: MediaKind;
  conversationId: string;
  uploaderUid: string;
  participants?: string[]; // conversation participant UIDs
}): Promise<{ publicUrl: string; path: string }> {
  const { fileUri, kind, conversationId, uploaderUid } = opts;
  const participantsCsv = (opts.participants || []).join(",");

  // Helper: decode base64 to bytes
  function base64ToBytes(b64: string): Uint8Array {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output: number[] = [];
    let buffer = 0;
    let bitsCollected = 0;
    for (let i = 0; i < b64.length; i++) {
      const ch = b64.charAt(i);
      if (ch === "=") break;
      const idx = chars.indexOf(ch);
      if (idx === -1) continue;
      buffer = (buffer << 6) | idx;
      bitsCollected += 6;
      if (bitsCollected >= 8) {
        bitsCollected -= 8;
        output.push((buffer >> bitsCollected) & 0xff);
      }
    }
    return new Uint8Array(output);
  }

  // Read file bytes safely in RN/Expo with fallback for file:// or content:// URIs
  let bytes: Uint8Array | null = null;
  try {
    const res = await fetch(fileUri);
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
  } catch (_) {
    // Fallback to FileSystem for local URIs
    try {
      const b64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      bytes = base64ToBytes(b64);
    } catch (e) {
      throw new Error(`Failed to read file bytes: ${String(e)}`);
    }
  }
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("Failed to read bytes from file URI");
  }

  const ext = getExtFromUri(fileUri);
  const contentType = mimeFromExt(ext, kind);

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  // Path must be relative to the bucket (do NOT prefix with bucket name)
  const path = `${conversationId}/${uploaderUid}/${kind}s/${fileName}`;

  // Require Supabase user id for owner to satisfy RLS (auth.uid())
  const { data: authData } = await supabase.auth.getUser();
  const supaUid = authData.user?.id;
  if (!supaUid) {
    throw new Error("No Supabase session. Please log in (email/password) to establish a Supabase session before uploading.");
  }
  const ownerId = supaUid;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "3600",
      // Attach owner metadata for policy enforcement/auditing
      metadata: { owner: ownerId, participants: participantsCsv },
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to get public URL from Supabase Storage");
  }

  return { publicUrl: data.publicUrl, path };
}
