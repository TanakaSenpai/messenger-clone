import { auth, db } from "app/configs/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

export type ChatMessageRecord = {
  id?: string;
  text: string;
  createdAt: Timestamp;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
};

export const buildConversationId = (userA: string, userB: string) => {
  return [userA, userB].sort().join("__");
};

export const ensureConversationDoc = async (
  conversationId: string,
  participants: string[]
) => {
  const convoRef = doc(db, "conversations", conversationId);
  const snap = await getDoc(convoRef);
  if (!snap.exists()) {
    await setDoc(convoRef, {
      participants,
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    });
  }
};

export const subscribeToMessages = (
  conversationId: string,
  onMessages: (messages: ChatMessageRecord[]) => void
) => {
  const msgsRef = collection(db, "conversations", conversationId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const items: ChatMessageRecord[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ChatMessageRecord, "id">),
    }));
    onMessages(items);
  });
};

export const sendMessageToConversation = async (
  conversationId: string,
  text: string,
  sender: { uid: string; name?: string; avatar?: string }
) => {
  const convoRef = doc(db, "conversations", conversationId);
  const msgsRef = collection(db, "conversations", conversationId, "messages");
  await addDoc(msgsRef, {
    text,
    createdAt: serverTimestamp(),
    senderId: sender.uid,
    senderName: sender.name,
    senderAvatar: sender.avatar,
  } satisfies Omit<ChatMessageRecord, "id">);
  await updateDoc(convoRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
};
