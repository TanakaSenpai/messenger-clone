import { auth, db } from "app/configs/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import type { User } from "app/api/auth";

export const uploadProfileImage = async (uri: string, uid: string): Promise<string> => {
  const res = await fetch(uri);
  const blob = await res.blob();
  const storage = getStorage();
  const fileRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
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
