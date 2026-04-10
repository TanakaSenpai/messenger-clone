import { auth, db } from "app/configs/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { supabase } from "app/configs/supabase";

const STORIES_BUCKET = "stories";

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  createdAt: Date;
  expiresAt: Date;
}

const STORY_DURATION_HOURS = 24;

export const createStory = async (
  uri: string,
  mediaType: "image" | "video"
): Promise<Story> => {
  if (!auth.currentUser) throw new Error("Not authenticated");

  const user = auth.currentUser;
  const uid = user.uid;

  // Get user info from Firestore
  const userDoc = await getDoc(doc(db, "userInfo", uid));
  const userData = userDoc.data();

  // Upload media to Supabase
  let bytes: Uint8Array;
  try {
    const res = await fetch(uri);
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
  } catch {
    const FileSystem = require("expo-file-system");
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const base64ToBytes = require("./storageSupabase").base64ToBytes;
    bytes = base64ToBytes(b64);
  }

  const fileName = `${uid}-${Date.now()}.${mediaType === "video" ? "mp4" : "jpg"}`;
  const path = `${uid}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORIES_BUCKET)
    .upload(path, bytes, {
      contentType: mediaType === "video" ? "video/mp4" : "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(STORIES_BUCKET).getPublicUrl(path);
  const mediaUrl = data.publicUrl;

  // Calculate expiry (24 hours from now)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STORY_DURATION_HOURS * 60 * 60 * 1000);

  // Create story document
  const storyRef = await addDoc(collection(db, "stories"), {
    userId: uid,
    userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : user.email,
    userAvatar: userData?.avatar || "",
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  });

  return {
    id: storyRef.id,
    userId: uid,
    userName: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : user.email,
    userAvatar: userData?.avatar || "",
    mediaUrl,
    mediaType,
    createdAt: now,
    expiresAt,
  };
};

export const getStories = async (): Promise<Story[]> => {
  const now = new Date().toISOString();

  // Get non-expired stories, ordered by creation time
  const q = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const stories: Story[] = [];

  // Group stories by user
  const userStoriesMap = new Map<string, Story[]>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const story: Story = {
      id: docSnap.id,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      expiresAt: new Date(data.expiresAt),
    };

    if (!userStoriesMap.has(data.userId)) {
      userStoriesMap.set(data.userId, []);
    }
    userStoriesMap.get(data.userId)!.push(story);
  }

  // Convert to array
  userStoriesMap.forEach((stories) => {
    stories.forEach((s) => stories.push(s));
  });

  return stories;
};

export const subscribeToStories = (
  callback: (stories: Story[]) => void
): (() => void) => {
  const now = new Date().toISOString();

  const q = query(
    collection(db, "stories"),
    where("expiresAt", ">", now),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const stories: Story[] = [];
    const userStoriesMap = new Map<string, Story[]>();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const story: Story = {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        expiresAt: new Date(data.expiresAt),
      };

      if (!userStoriesMap.has(data.userId)) {
        userStoriesMap.set(data.userId, []);
      }
      userStoriesMap.get(data.userId)!.push(story);
    }

    userStoriesMap.forEach((userStories) => {
      stories.push(...userStories);
    });

    callback(stories);
  });
};

export const deleteStory = async (storyId: string): Promise<void> => {
  await deleteDoc(doc(db, "stories", storyId));
};

export const cleanupExpiredStories = async (): Promise<number> => {
  const now = new Date().toISOString();
  const q = query(
    collection(db, "stories"),
    where("expiresAt", "<=", now)
  );

  const snapshot = await getDocs(q);
  let deletedCount = 0;

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
    deletedCount++;
  }

  return deletedCount;
};