import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { subscribeToMessages, ChatMessageRecord } from "app/api/messages";
import colors from "app/configs/colors";
import { useContext } from "react";
import { AuthContext } from "app/auth/context";

type SearchConvoScreenRouteProp = RouteProp<RootStackParamList, "SearchConvo">;

interface Props {
  route: SearchConvoScreenRouteProp;
}

const SearchConvoScreen = ({ route }: Props) => {
  const { conversationId, chatName } = route.params;
  const { user: currentUser } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [allMessages, setAllMessages] = useState<ChatMessageRecord[]>([]);
  const [results, setResults] = useState<ChatMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      setAllMessages(messages.filter((m) => m.type === "text"));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const filtered = allMessages.filter((m) =>
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setResults(filtered.reverse()); // Show latest results first
  }, [searchQuery, allMessages]);

  const renderResult = ({ item }: { item: ChatMessageRecord }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <Text style={styles.senderName}>
          {item.senderId === currentUser?.uid ? "You" : chatName}
        </Text>
        <Text style={styles.resultTime}>
            {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : ""}
        </Text>
      </View>
      <Text style={styles.resultContent} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={colors.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.blue} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
            ) : (
              <Text style={styles.emptyText}>Start typing to search in conversation</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.darkGray,
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  resultItem: {
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  senderName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  resultTime: {
    color: colors.mediumGray,
    fontSize: 12,
  },
  resultContent: {
    color: colors.lightGray,
    fontSize: 15,
    lineHeight: 20,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
});

export default SearchConvoScreen;
