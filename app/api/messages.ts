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

    // Wait a moment to ensure the document is committed
    await new Promise((resolve) => setTimeout(resolve, 100));
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
  try {
    const convoRef = doc(db, "conversations", conversationId);
    const msgsRef = collection(db, "conversations", conversationId, "messages");

    // Check if conversation exists
    let convoSnap;
    let conversationExists = false;
    
    try {
      convoSnap = await getDoc(convoRef);
      conversationExists = convoSnap.exists();
    } catch (error) {
      // Assume conversation doesn't exist if we can't read it
      conversationExists = false;
    }

    if (conversationExists && convoSnap) {
      // Existing conversation: verify user is a participant
      const convoData = convoSnap.data();
      if (
        !convoData ||
        !convoData.participants ||
        !convoData.participants.includes(sender.uid)
      ) {
        throw new Error(
          `User ${sender.uid} is not a participant in conversation ${conversationId}`
        );
      }
    }

    // Extract participants from conversationId for first message
    const participants = conversationId.split('__');

    // Add the message (with participants for first message scenario)
    const messageData: any = {
      text,
      createdAt: serverTimestamp(),
      senderId: sender.uid,
      senderName: sender.name,
      senderAvatar: sender.avatar,
    };

    // For first messages, include participants array as required by Firebase rules
    if (!conversationExists) {
      messageData.participants = participants;
    }

    await addDoc(msgsRef, messageData);

    // Create or update conversation metadata
    if (!conversationExists) {
      // First message: create conversation document
      await setDoc(convoRef, {
        participants,
        createdAt: serverTimestamp(),
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } else {
      // Existing conversation: update metadata
      await updateDoc(convoRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`[sendMessageToConversation] Error:`, error);
    throw error;
  }
};
