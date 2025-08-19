import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  FlatList,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  getDocs,
} from "firebase/firestore";
import colors from "app/configs/colors";

export interface Chat {
  id: string; // partner uid (other participant)
  name: string;
  message: string; // last message text
  time: string; // formatted last message time
  avatar: string;
  isRead: boolean; // placeholder for now
}

export interface UserSuggestion {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
}

const { width } = Dimensions.get("window");

const formatTime = (ts?: Timestamp) => {
  try {
    const d = ts?.toDate?.() ?? new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const Chats = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);


  const [items, setItems] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch user suggestions for search
  const fetchUserSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim() || !user?.uid) {
        setUserSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {

        setIsLoadingSuggestions(false);
        setUserSuggestions([]);
      }, 10000);
      try {
        const usersRef = collection(db, "userInfo");

        // Try to get users with proper error handling
        let snapshot;
        try {
          snapshot = await getDocs(usersRef);

        } catch (firestoreError) {
          console.error(`[Search] Firestore error:`, firestoreError);
          // Fallback: try to get users without any filters
          snapshot = await getDocs(usersRef);
        }

        const suggestions: UserSuggestion[] = [];



        if (snapshot.docs.length === 0) {

          setUserSuggestions([]);
          return;
        }

        snapshot.forEach((doc) => {
          const userData = doc.data();


          // Double-check: ensure we never include the current user
          if (userData.uid === user.uid) {
            console.log(
              `[Search] Skipping current user: ${userData.username || userData.firstName}`
            );
            return; // Skip current user
          }

          const fullName = `${userData.firstName || ""} ${
            userData.lastName || ""
          }`.toLowerCase();
          const username = (userData.username || "").toLowerCase();
          const searchLower = query.toLowerCase();

          // Check if query matches username or name (starts with or contains)
          const nameStartsWith = fullName.startsWith(searchLower);
          const usernameStartsWith = username.startsWith(searchLower);
          const nameContains = fullName.includes(searchLower);
          const usernameContains = username.includes(searchLower);

          if (
            nameStartsWith ||
            usernameStartsWith ||
            nameContains ||
            usernameContains
          ) {
            console.log(
              `[Search] Match found: ${userData.firstName} ${userData.lastName} (@${userData.username})`
            );
            suggestions.push({
              uid: userData.uid,
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              username: userData.username || "",
              avatar: userData.avatar || "https://picsum.photos/seed/user/50",
            });
          }
        });



        // Clear timeout since we got results
        clearTimeout(timeoutId);

        // Sort by relevance (starts with first, then contains)
        suggestions.sort((a, b) => {
          const aUsername = a.username.toLowerCase();
          const bUsername = b.username.toLowerCase();
          const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
          const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
          const queryLower = query.toLowerCase();

          // Exact matches first
          if (aUsername === queryLower || aName === queryLower) return -1;
          if (bUsername === queryLower || bName === queryLower) return 1;

          // Then by username starts with
          if (
            aUsername.startsWith(queryLower) &&
            !bUsername.startsWith(queryLower)
          )
            return -1;
          if (
            bUsername.startsWith(queryLower) &&
            !aUsername.startsWith(queryLower)
          )
            return 1;

          // Then by name starts with
          if (aName.startsWith(queryLower) && !bName.startsWith(queryLower))
            return -1;
          if (bName.startsWith(queryLower) && !aName.startsWith(queryLower))
            return 1;

          // Then by username contains
          if (aUsername.includes(queryLower) && !bUsername.includes(queryLower))
            return -1;
          if (bUsername.includes(queryLower) && !aUsername.includes(queryLower))
            return 1;

          // Then by name contains
          if (aName.includes(queryLower) && !bName.includes(queryLower))
            return -1;
          if (bName.includes(queryLower) && !aName.includes(queryLower))
            return 1;

          return 0;
        });

        setUserSuggestions(suggestions.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error("Error fetching user suggestions:", error);
        setUserSuggestions([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoadingSuggestions(false);
      }
    },
    [user?.uid]
  );

  // Fetch initial profile suggestions when search is focused
  const fetchInitialSuggestions = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoadingSuggestions(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {

      setIsLoadingSuggestions(false);
      setUserSuggestions([]);
    }, 10000);

    try {
      const usersRef = collection(db, "userInfo");

      // Try to get users with proper error handling
      let snapshot;
      try {
        snapshot = await getDocs(usersRef);

      } catch (firestoreError) {
        console.error(`[Initial] Firestore error:`, firestoreError);
        // Fallback: try to get users without any filters
        snapshot = await getDocs(usersRef);
      }

      const suggestions: UserSuggestion[] = [];



      if (snapshot.docs.length === 0) {

        setUserSuggestions([]);
        return;
      }

      snapshot.forEach((doc) => {
        const userData = doc.data();


        // Double-check: ensure we never include the current user
        if (userData.uid === user.uid) {

          return; // Skip current user
        }

        suggestions.push({
          uid: userData.uid,
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          username: userData.username || "",
          avatar: userData.avatar || "https://picsum.photos/seed/user/50",
        });
      });



      // Clear timeout since we got results
      clearTimeout(timeoutId);

      // Sort by name for initial suggestions
      suggestions.sort((a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      });

      setUserSuggestions(suggestions.slice(0, 8)); // Show 8 initial suggestions
    } catch (error) {
      console.error("Error fetching initial suggestions:", error);
      setUserSuggestions([]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingSuggestions(false);
    }
  }, [user?.uid]);

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      fetchUserSuggestions(text);
      setShowSuggestions(true);
    } else {
      // When clearing text, show initial suggestions instead of hiding
      fetchInitialSuggestions();
      setShowSuggestions(true);
    }
  };

  // Handle search focus
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (!searchQuery.trim()) {
      // Show initial suggestions if no search query
      fetchInitialSuggestions();
      setShowSuggestions(true);
    } else {
      // If there's a search query, show search results
      setShowSuggestions(true);
    }
  };

  // Handle search blur
  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    // Don't hide suggestions on blur - keep them visible
    // This allows users to see and interact with suggestions
  };

  // Handle user selection from suggestions
  const handleUserSelect = (selectedUser: UserSuggestion) => {


    // Create a chat item for the selected user
    const chatItem: Chat = {
      id: selectedUser.uid,
      name: selectedUser.firstName
        ? `${selectedUser.firstName} ${selectedUser.lastName}`
        : selectedUser.username,
      message: "",
      time: "",
      avatar: selectedUser.avatar,
      isRead: true,
    };



    try {
      // Navigate to conversation


      // Try different navigation approaches
      if (navigation.navigate) {
        // Try the exact route name from the navigation structure
        navigation.navigate(
          "Conversation" as never,
          { chat: chatItem } as never
        );

      } else {

      }
    } catch (error) {
      console.error(`[Navigation] Navigation failed:`, error);
    }

    // Clear search and hide suggestions
    setSearchQuery("");
    setShowSuggestions(false);
    setUserSuggestions([]);
    Keyboard.dismiss();
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    // Show initial suggestions when clearing search
    fetchInitialSuggestions();
    setShowSuggestions(true);
    Keyboard.dismiss();
  };

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

  // Render user suggestion item
  const renderUserSuggestion = ({ item }: { item: UserSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleUserSelect(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.avatar }} style={styles.suggestionAvatar} />
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionName}>
          {item.firstName
            ? `${item.firstName} ${item.lastName}`
            : item.username}
        </Text>
        <Text style={styles.suggestionUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.startChatButton}
        onPress={() => handleUserSelect(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-outline" size={16} color={colors.blue} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={colors.mediumGray}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={colors.mediumGray}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.mediumGray}
              />
            </TouchableOpacity>
          )}
        </View>


      </View>

      {/* User Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsTitle}>
              {searchQuery.trim() ? "Search Results" : "People You May Know"}
            </Text>
            <View style={styles.suggestionsHeaderRight}>
              {isLoadingSuggestions && (
                <ActivityIndicator size="small" color={colors.blue} />
              )}
              <TouchableOpacity
                style={styles.closeSuggestionsButton}
                onPress={() => setShowSuggestions(false)}
              >
                <Ionicons name="close" size={20} color={colors.lightGray} />
              </TouchableOpacity>
            </View>
          </View>

          {userSuggestions.length > 0 ? (
            <FlatList
              data={userSuggestions}
              keyExtractor={(item) => item.uid}
              renderItem={renderUserSuggestion}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
              scrollEnabled={false}
            />
          ) : !isLoadingSuggestions ? (
            <Text style={styles.noResultsText}>
              {searchQuery.trim()
                ? "No users found"
                : "No suggestions available"}
            </Text>
          ) : null}
        </View>
      )}

      {/* Chats List */}
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
        contentContainerStyle={[
          styles.chatsList,
          { paddingTop: showSuggestions ? 0 : 16 },
        ]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {showSuggestions ? "" : "No chats available"}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkGray,
  },


  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.darkGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  suggestionsContainer: {
    backgroundColor: colors.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeSuggestionsButton: {
    marginLeft: 12,
    padding: 4,
  },
  suggestionsTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  suggestionsList: {
    paddingBottom: 8,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.darkGray,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  suggestionUsername: {
    color: colors.lightGray,
    fontSize: 14,
  },
  startChatButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  noResultsText: {
    color: colors.lightGray,
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  chatsList: {
    paddingBottom: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: colors.lightGray,
  },
});

export default Chats;
