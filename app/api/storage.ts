import { storage } from "app/configs/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type MediaKind = "image" | "video";

function getExtFromUri(uri: string): string {
  const q = uri.split("?")[0];
  const dot = q.lastIndexOf(".");
  return dot >= 0 ? q.slice(dot + 1).toLowerCase() : "jpg";
}

export async function uploadFileFromUri(opts: {
  fileUri: string;
  kind: MediaKind;
  conversationId: string;
  uploaderUid: string;
}): Promise<{ downloadUrl: string; path: string }> {
  const { fileUri, kind, conversationId, uploaderUid } = opts;

  // Fetch the file into a blob
  const res = await fetch(fileUri);
  const blob = await res.blob();

  // Create a unique path in Firebase Storage
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${getExtFromUri(
    fileUri
  )}`;
  const path = `conversations/${conversationId}/${uploaderUid}/${kind}s/${fileName}`;

  // Upload to Firebase Storage
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, blob);
  
  // Get download URL
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return { downloadUrl, path: snapshot.ref.fullPath };
}
