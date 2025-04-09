import React from "react";
import { StyleSheet, Text, FlatList } from "react-native";

import MsgPreview from "app/components/MsgPreview";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "app/navigation/types";

export interface Chat {
  id: number;
  name: string;
  message: string;
  time: string;
  avatar: string;
  isRead: boolean;
}
const chats = [
  {
    id: 1,
    name: "Alice",
    message: "Hey, how are you?",
    time: "10:30 AM",
    avatar: "https://picsum.photos/seed/alice/50", // Random image
    isRead: true,
  },
  {
    id: 2,
    name: "Bob",
    message: "Let's catch up later.",
    time: "9:15 AM",
    avatar: "https://picsum.photos/seed/bob/50",
    isRead: false,
  },
  {
    id: 3,
    name: "Charlie",
    message: "Got it, thanks!",
    time: "Yesterday",
    avatar: "https://picsum.photos/seed/charlie/50",
    isRead: true,
  },
  {
    id: 4,
    name: "Diana",
    message: "See you tomorrow.",
    time: "Monday",
    avatar: "https://picsum.photos/seed/diana/50",
    isRead: false,
  },
  {
    id: 5,
    name: "Eve",
    message:
      "Can you send me the files? I need them right now, like immediately!",
    time: "Sunday",
    avatar: "https://picsum.photos/seed/eve/50",
    isRead: true,
  },
];

const Chats = () => {
  type ChatScreenNavProp = StackNavigationProp<RootStackParamList, "Conversation">
  const navigation = useNavigation<ChatScreenNavProp>();
  return (
      <FlatList
        data={chats}
        keyExtractor={(chat) => chat.id.toString()}
        renderItem={({ item }) => <MsgPreview chat={item} onPress={(item) => navigation.navigate("Conversation", {chat: item})} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No chats available</Text>
        }
      />
  );
};

const styles = StyleSheet.create({
  container: {},
  header: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    color: "#fff",
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#aaa",
  },
  footer: {
    textAlign: "center",
    padding: 16,
    color: "#ccc",
  },
});

export default Chats;
