import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "react-native-vector-icons/Ionicons";
import colors from "app/configs/colors";
import { subscribeToFeedPosts, Post } from "app/api/posts";
import { toggleLike, subscribeToLikes } from "app/api/social";
import Stories from "./Stories"; // Reusing stories horizontal list
import { Video, ResizeMode } from "expo-av";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FeedScreen = ({ navigation }: any) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToFeedPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderPost = ({ item }: { item: Post }) => (
    <PostItem post={item} navigation={navigation} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Instagram</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="heart-outline" size={26} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon} 
            onPress={() => navigation.navigate("ChatsTab")}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        ListHeaderComponent={<View style={{ marginBottom: 10 }}><Stories /></View>}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No posts yet. Follow someone!</Text> : null
        }
        refreshing={loading}
        onRefresh={() => setLoading(true)}
      />
    </SafeAreaView>
  );
};

const PostItem = ({ post, navigation }: { post: Post; navigation: any }) => {
  const [likes, setLikes] = useState(post.likesCount);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLikes(post.id, (count, liked) => {
      setLikes(count);
      setIsLiked(liked);
    });
    return () => unsubscribe();
  }, [post.id]);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => navigation.navigate("Profile", { userId: post.userId })}
        >
          <Image source={{ uri: post.userAvatar || "https://via.placeholder.com/150" }} style={styles.userAvatar} />
          <Text style={styles.userName}>{post.userName}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.mediaContainer}>
        {post.mediaType === "image" ? (
          <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: post.mediaUrl }}
            style={styles.postMedia}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping
          />
        )}
      </View>

      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={() => toggleLike(post.id)}>
            <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={26} 
                color={isLiked ? colors.red : colors.white} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.postInfo}>
        <Text style={styles.likesText}>{likes} likes</Text>
        <View style={styles.captionContainer}>
          <Text style={styles.captionName}>{post.userName}</Text>
          <Text style={styles.captionText}>{post.caption}</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.commentsText}>View all {post.commentsCount} comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "System", // In a real app, use a script font
  },
  headerIcons: {
    flexDirection: "row",
  },
  headerIcon: {
    marginLeft: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  postCard: {
    marginBottom: 15,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  userName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: "#1a1a1a",
  },
  postMedia: {
    width: "100%",
    height: "100%",
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    marginLeft: 15,
  },
  postInfo: {
    paddingHorizontal: 12,
  },
  likesText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  captionContainer: {
    flexDirection: "row",
    marginTop: 5,
    flexWrap: "wrap",
  },
  captionName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 5,
  },
  captionText: {
    color: colors.white,
    fontSize: 14,
  },
  commentsText: {
    color: colors.mediumGray,
    fontSize: 14,
    marginTop: 5,
  },
  emptyText: {
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 50,
  },
});

export default FeedScreen;
