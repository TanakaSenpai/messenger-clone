import { auth, db } from "app/configs/firebase";
import {
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

// Exact message schema per spec
export type ChatMessageRecord = {
  id: string; // unique message id
  conversationId: string; // which chat this belongs to
  senderId: string; // user who sent it
  receiverId: string; // user who should get it
  type: "text" | "image" | "video" | "file"; // message type
  content: string | null; // actual text (null if media)
  mediaUrl: string | null; // signed URL or storage path
  status: "sent" | "delivered" | "seen";
  createdAt: Timestamp; // when message was created (client)
  sentAt: Timestamp | null; // when stored in server
  deliveredAt: Timestamp | null; // when delivered to receiver
  seenAt: Timestamp | null; // when receiver viewed it
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

// Receiver marks a message as sent when it arrives on their device (online)
export const markMessageSent = async (
  conversationId: string,
  messageId: string
) => {
  const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
  await updateDoc(msgRef, {
    status: "sent",
    sentAt: serverTimestamp(),
  });
};

// Receiver marks a message as seen when viewing it in the conversation
export const markMessageSeen = async (
  conversationId: string,
  messageId: string
) => {
  const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
  await updateDoc(msgRef, {
    status: "seen",
    seenAt: serverTimestamp(),
  });
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
  sender: { uid: string; name?: string; avatar?: string },
  createdAtClient?: Date
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
    const participants = conversationId.split("__");

    // Compute receiverId from conversationId (2 participants)
    const [a, b] = participants;
    const receiverId = sender.uid === a ? b : a;

    // Create with explicit ID so 'id' is stored on document
    const newDocRef = doc(msgsRef);
    const messageData: ChatMessageRecord = {
      id: newDocRef.id,
      conversationId,
      senderId: sender.uid,
      receiverId,
      type: "text",
      content: text,
      mediaUrl: null,
      status: "delivered",
      createdAt: Timestamp.fromDate(createdAtClient ?? new Date()),
      sentAt: null,
      deliveredAt: serverTimestamp() as any,
      seenAt: null,
    };

    // Create or update conversation metadata
    if (!conversationExists) {
      // First message: create conversation document BEFORE message per rules
      await setDoc(convoRef, {
        participants,
        createdAt: serverTimestamp(),
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
      // Now write the first message
      await setDoc(newDocRef, messageData as any);
    } else {
      // Existing conversation: write message then update metadata
      await setDoc(newDocRef, messageData as any);
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

// Send media message (image or video)
export const sendMediaMessageToConversation = async (
  conversationId: string,
  media: { url: string; type: "image" | "video"; caption?: string },
  sender: { uid: string; name?: string; avatar?: string },
  createdAtClient?: Date
) => {
  try {
    const convoRef = doc(db, "conversations", conversationId);
    const msgsRef = collection(db, "conversations", conversationId, "messages");

    let convoSnap;
    let conversationExists = false;
    try {
      convoSnap = await getDoc(convoRef);
      conversationExists = convoSnap.exists();
    } catch (error) {
      conversationExists = false;
    }

    if (conversationExists && convoSnap) {
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

    const participants = conversationId.split("__");
    const [a, b] = participants;
    const receiverId = sender.uid === a ? b : a;

    const newDocRef = doc(msgsRef);
    const messageData: ChatMessageRecord = {
      id: newDocRef.id,
      conversationId,
      senderId: sender.uid,
      receiverId,
      type: media.type,
      content: null,
      mediaUrl: media.url,
      status: "delivered",
      createdAt: Timestamp.fromDate(createdAtClient ?? new Date()),
      sentAt: null,
      deliveredAt: serverTimestamp() as any,
      seenAt: null,
    };

    if (!conversationExists) {
      // Create convo first to satisfy rules, then write the message
      await setDoc(convoRef, {
        participants,
        createdAt: serverTimestamp(),
        lastMessage: media.type === "image" ? "[Photo]" : "[Video]",
        lastMessageAt: serverTimestamp(),
      });
      await setDoc(newDocRef, messageData as any);
    } else {
      await setDoc(newDocRef, messageData as any);
      await updateDoc(convoRef, {
        lastMessage: media.type === "image" ? "[Photo]" : "[Video]",
        lastMessageAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error(`[sendMediaMessageToConversation] Error:`, error);
    throw error;
  }
};
