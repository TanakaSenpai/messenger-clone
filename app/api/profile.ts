import { auth, db } from "app/configs/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { supabase } from "app/configs/supabase";
import * as FileSystem from "expo-file-system";
import { base64ToBytes } from "./storageSupabase";
import { updateProfile } from "firebase/auth";
import type { User } from "app/api/auth";

export const uploadProfileImage = async (uri: string, uid: string): Promise<string> => {
  // Ensure we have a Supabase session (needed for RLS policies)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("No Supabase session. Please log out and log back in to upload a profile picture.");
  }

  let bytes: Uint8Array | null = null;
  try {
    const res = await fetch(uri);
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
  } catch (_) {
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType?.Base64 || "base64" as any,
      });
      bytes = base64ToBytes(b64);
    } catch (e) {
      throw new Error(`Failed to read profile image: ${String(e)}`);
    }
  }

  if (!bytes) throw new Error("Could not read image data");

  const fileName = `${uid}-${Date.now()}.jpg`;
  // Store under uid/ folder so RLS can match auth.uid() to folder name
  const path = `${uid}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[profile] Supabase avatar upload error:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

export const updateUserProfile = async (
  updates: Partial<User> & { avatarFileUri?: string }
): Promise<Partial<User>> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const uid = auth.currentUser.uid;

  let avatarUrl: string | undefined = updates.avatar;
  if (updates.avatarFileUri) {
    avatarUrl = await uploadProfileImage(updates.avatarFileUri, uid);
  }

  const displayNameParts = [updates.firstName, updates.lastName].filter(Boolean) as string[];
  const displayName = displayNameParts.length ? displayNameParts.join(" ") : undefined;

  const firestorePayload: any = {
    ...updates,
    ...(avatarUrl ? { avatar: avatarUrl } : {}),
    updatedAt: serverTimestamp(),
  };
  delete firestorePayload.password;
  delete firestorePayload.avatarFileUri;
  delete firestorePayload.uid;
  delete firestorePayload.createdAt;

  await updateDoc(doc(db, "userInfo", uid), firestorePayload);

  try {
    await updateProfile(auth.currentUser, {
      ...(displayName ? { displayName } : {}),
      ...(avatarUrl ? { photoURL: avatarUrl } : {}),
    });
  } catch (e) {
    // Non-critical; Firestore is source of truth for profile fields
  }

  return { ...firestorePayload, uid } as Partial<User>;
};
