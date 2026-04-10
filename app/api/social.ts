import { db, auth } from "app/configs/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

export const toggleLike = async (postId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const likeRef = doc(db, "likes", `${postId}_${user.uid}`);
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (transaction) => {
    const likeDoc = await transaction.get(likeRef);
    const postDoc = await transaction.get(postRef);

    if (!postDoc.exists()) throw new Error("Post does not exist");

    if (likeDoc.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likesCount: Math.max(0, (postDoc.data().likesCount || 1) - 1) });
    } else {
      transaction.set(likeRef, {
        postId,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      transaction.update(postRef, { likesCount: (postDoc.data().likesCount || 0) + 1 });
    }
  });
};

export const subscribeToLikes = (postId: string, callback: (likesCount: number, isLiked: boolean) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(collection(db, "likes"), where("postId", "==", postId));
  return onSnapshot(q, (snapshot) => {
    const likesCount = snapshot.size;
    const isLiked = snapshot.docs.some(doc => doc.id === `${postId}_${user.uid}`);
    callback(likesCount, isLiked);
  });
};

export const addComment = async (postId: string, content: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const commentData = {
    postId,
    userId: user.uid,
    userName: user.displayName || "Unknown",
    userAvatar: user.photoURL || "",
    content,
    createdAt: serverTimestamp(),
  };

  const postRef = doc(db, "posts", postId);
  
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error("Post does not exist");

    await addDoc(collection(db, "comments"), commentData);
    transaction.update(postRef, { commentsCount: (postDoc.data().commentsCount || 0) + 1 });
  });
};

export const toggleFollow = async (targetUserId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (user.uid === targetUserId) throw new Error("Cannot follow yourself");

  const followRef = doc(db, "follows", `${user.uid}_${targetUserId}`);

  const snapshot = await getDocs(query(collection(db, "follows"), where("followerId", "==", user.uid), where("followingId", "==", targetUserId)));
  
  if (!snapshot.empty) {
    await deleteDoc(doc(db, "follows", snapshot.docs[0].id));
  } else {
    await addDoc(collection(db, "follows"), {
      followerId: user.uid,
      followingId: targetUserId,
      createdAt: serverTimestamp(),
    });
  }
};
