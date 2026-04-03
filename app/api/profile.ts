import { auth, db } from "app/configs/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { supabase } from "app/configs/supabase";
import * as FileSystem from "expo-file-system";
import { base64ToBytes } from "./storageSupabase";
import { updateProfile } from "firebase/auth";
import type { User } from "app/api/auth";

export const uploadProfileImage = async (uri: string, uid: string): Promise<string> => {
  let { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError) {
    console.error("[profile] Supabase session error:", sessionError);
  }
  if (!user) {
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error("[profile] Supabase refresh error:", refreshError);
    }
    user = session?.user ?? null;
  }
  if (!user) {
    throw new Error("No Supabase session. Please log out and log back in to upload a profile picture.");
  }

  console.log("[profile] Supabase user:", user.id);
  console.log("[profile] Firebase uid:", uid);

  let bytes: Uint8Array | null = null;
  try {
    const res = await fetch(uri);
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
  } catch (_) {
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });
      bytes = base64ToBytes(b64);
    } catch (e) {
      throw new Error(`Failed to read profile image: ${String(e)}`);
    }
  }

  if (!bytes) throw new Error("Could not read image data");

  const fileName = `${uid}-${Date.now()}.jpg`;
  const path = `${uid}/${fileName}`;

  console.log("[profile] Uploading to path:", path);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[profile] Supabase avatar upload error:", uploadError);
    console.error("[profile] Upload error details:", JSON.stringify(uploadError));
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

  await setDoc(doc(db, "userInfo", uid), firestorePayload, { merge: true });

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
