import { db } from "app/configs/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { supabase } from "app/configs/supabase";
import * as FileSystem from "expo-file-system";
import { base64ToBytes } from "./storageSupabase";
import { auth } from "app/configs/firebase";

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

const BUCKET = "posts";

export const uploadPostMedia = async (uri: string, uid: string): Promise<string> => {
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
      throw new Error(`Failed to read media: ${String(e)}`);
    }
  }

  if (!bytes) throw new Error("Could not read media data");

  const fileName = `${uid}-${Date.now()}.jpg`;
  const path = `${uid}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const createPost = async (
  mediaUri: string,
  mediaType: "image" | "video",
  caption: string
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const mediaUrl = await uploadPostMedia(mediaUri, user.uid);

  const postData = {
    userId: user.uid,
    userName: user.displayName || "Unknown",
    userAvatar: user.photoURL || "",
    mediaUrl,
    mediaType,
    caption,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "posts"), postData);
  return { id: docRef.id, ...postData };
};

export const subscribeToFeedPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[];
    callback(posts);
  });
};

export const subscribeToUserPosts = (userId: string, callback: (posts: Post[]) => void) => {
  const q = query(
    collection(db, "posts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[];
    callback(posts);
  });
};

export const deletePost = async (postId: string) => {
  await deleteDoc(doc(db, "posts", postId));
};
