import React, { useEffect, useMemo, useState, useContext } from "react";
import { StyleSheet, Text, FlatList } from "react-native";

import MsgPreview from "app/components/MsgPreview";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "app/navigation/types";
import { AuthContext } from "app/auth/context";
import { db } from "app/configs/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

export interface Chat {
  id: string; // partner uid (other participant)
  name: string;
  message: string; // last message text
  time: string; // formatted last message time
  avatar: string;
  isRead: boolean; // placeholder for now
}

const formatTime = (ts?: Timestamp) => {
  try {
    const d = ts?.toDate?.() ?? new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const Chats = () => {
  type ChatScreenNavProp = StackNavigationProp<
    RootStackParamList,
    "Conversation"
  >;
  const navigation = useNavigation<ChatScreenNavProp>();
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState<Chat[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const convosRef = collection(db, "conversations");
    const q = query(
      convosRef,
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const next: Chat[] = [];
      for (const d of snap.docs) {
        const convo = d.data() as {
          participants: string[];
          lastMessage?: string;
          lastMessageAt?: Timestamp;
        };
        const otherId =
          convo.participants.find((p) => p !== user.uid) || user.uid;
        const otherDoc = await getDoc(doc(db, "userInfo", otherId));
        const other = (otherDoc.data() as any) || {};
        next.push({
          id: otherId,
          name: other.firstName
            ? `${other.firstName} ${other.lastName}`
            : other.username || "User",
          avatar: other.avatar || "https://picsum.photos/seed/user/50",
          message: convo.lastMessage || "",
          time: formatTime(convo.lastMessageAt),
          isRead: true,
        });
      }
      setItems(next);
    });
    return unsub;
  }, [user?.uid]);

  return (
    <FlatList
      data={items}
      keyExtractor={(chat) => chat.id}
      renderItem={({ item }) => (
        <MsgPreview
          chat={item}
          onPress={(it) => navigation.navigate("Conversation", { chat: it })}
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
      ListEmptyComponent={<Text style={styles.empty}>No chats available</Text>}
    />
  );
};

const styles = StyleSheet.create({
  container: {},
  empty: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#aaa",
  },
});

export default Chats;
