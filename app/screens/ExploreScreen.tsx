import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "react-native-vector-icons/Ionicons";
import colors from "app/configs/colors";
import { subscribeToFeedPosts, Post } from "app/api/posts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "app/configs/firebase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_WIDTH = SCREEN_WIDTH / 3;

interface UserSearchResult {
  uid: string;
  username: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
}

const ExploreScreen = ({ navigation }: any) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToFeedPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoadingPosts(false);
    });
    return () => unsubscribe();
  }, []);

  const searchUsers = async (text: string) => {
    if (!text.trim()) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "userInfo");
      // Basic prefix search on username
      const q1 = query(
        usersRef,
        where("username", ">=", text),
        where("username", "<=", text + "\uf8ff")
      );
      
      const snapshot = await getDocs(q1);
      const results: UserSearchResult[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          uid: doc.id,
          username: data.username || "",
          avatar: data.avatar || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        });
      });
      setUsers(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.length > 0) {
      setLoadingUsers(true);
      searchUsers(debouncedQuery);
    } else {
      setUsers([]);
      setLoadingUsers(false);
    }
  }, [debouncedQuery]);

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
        style={styles.postThumbnail}
        onPress={() => navigation.navigate("Feed", { postId: item.id })}
    >
      <Image source={{ uri: item.mediaUrl || (item.mediaItems?.[0]?.url || "") }} style={styles.thumbnailImage} />
      {item.mediaType === "video" && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={12} color="#fff" />
        </View>
      )}
      {item.mediaItems && item.mediaItems.length > 1 && (
        <View style={styles.multiIndicator}>
          <Ionicons name="copy-outline" size={13} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity 
        style={styles.userRow}
        onPress={() => navigation.navigate("Profile", { userId: item.uid })}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color={colors.white} />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userFullName}>
          {[item.firstName, item.lastName].filter(Boolean).join(" ")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={colors.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for accounts..."
          placeholderTextColor={colors.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length === 0 ? (
        loadingPosts ? (
          <ActivityIndicator style={styles.loader} color={colors.blue} />
        ) : (
          <FlatList
            key="posts-grid"
            data={posts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts around here</Text>
            }
          />
        )
      ) : (
        loadingUsers ? (
          <ActivityIndicator style={styles.loader} color={colors.blue} />
        ) : (
          <FlatList
            key="users-list"
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found</Text>
            }
          />
        )
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
    borderRadius: 8,
    margin: 12,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  postThumbnail: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    padding: 0.5,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  videoIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  multiIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 3,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 50,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.darkGray,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: 15,
    justifyContent: "center",
  },
  userName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  userFullName: {
    color: colors.mediumGray,
    fontSize: 14,
    marginTop: 2,
  },
});

export default ExploreScreen;
