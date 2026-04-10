import React, { useState, useEffect } from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_WIDTH = SCREEN_WIDTH / 3;

const ExploreScreen = ({ navigation }: any) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToFeedPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setFilteredPosts(fetchedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = posts.filter(
      (p) => 
        p.caption.toLowerCase().includes(lowerQuery) || 
        p.userName.toLowerCase().includes(lowerQuery)
    );
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
        style={styles.postThumbnail}
        onPress={() => navigation.navigate("Feed", { postId: item.id })} // In a real app, jump to specific post
    >
      <Image source={{ uri: item.mediaUrl }} style={styles.thumbnailImage} />
      {item.mediaType === "video" && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={colors.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.blue} />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No posts found</Text>
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
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 50,
  },
});

export default ExploreScreen;
