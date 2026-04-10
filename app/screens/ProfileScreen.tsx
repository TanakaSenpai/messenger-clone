import React, { useState, useEffect, useContext } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "app/auth/context";
import { db } from "app/configs/firebase";
import { subscribeToUserPosts, Post } from "app/api/posts";
import colors from "app/configs/colors";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_WIDTH = SCREEN_WIDTH / 3;

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;

interface Props {
  route: ProfileScreenRouteProp;
}

const ProfileScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useContext(AuthContext);
  const targetUserId = route.params?.userId || currentUser?.uid;
  const isOwnProfile = targetUserId === currentUser?.uid;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (!targetUserId) return;

    // Fetch user info for target profile (mock or from userInfo collection)
    // For now using currentUser if matches
    if (isOwnProfile) {
        setUserInfo(currentUser);
    }

    const unsubscribe = subscribeToUserPosts(targetUserId, (fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.postThumbnail}>
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

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.profileTop}>
        <Image 
          source={{ uri: isOwnProfile ? currentUser?.avatar : userInfo?.avatar || "https://via.placeholder.com/150" }} 
          style={styles.avatar} 
        />
        <View style={styles.statsContainer}>
          <StatBox label="Posts" count={posts.length} />
          <StatBox label="Followers" count={0} />
          <StatBox label="Following" count={0} />
        </View>
      </View>

      <View style={styles.bioContainer}>
        <Text style={styles.displayName}>
          {isOwnProfile 
            ? (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : "Me") 
            : (userInfo?.name || userInfo?.username || "User")}
        </Text>
        <Text style={styles.bio}>Digital Creator • Photography Lover</Text>
      </View>

      <View style={styles.actionButtons}>
        {isOwnProfile ? (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate("Menu", { screen: "Settings" })}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editButton, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.editButtonText}>Message</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <View style={styles.tabs}>
          <View style={[styles.tab, styles.activeTab]}>
              <Ionicons name="apps" size={24} color={colors.white} />
          </View>
          <View style={styles.tab}>
              <Ionicons name="bookmark-outline" size={24} color={colors.mediumGray} />
          </View>
          <View style={styles.tab}>
              <Ionicons name="person-add-outline" size={24} color={colors.mediumGray} />
          </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <Text style={styles.headerUsername}>
          {isOwnProfile ? currentUser?.username : userInfo?.username || "Username"}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={() => navigation.navigate("Menu")}>
            <Ionicons name="menu" size={28} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={posts}
        ListHeaderComponent={Header}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}
      />
    </SafeAreaView>
  );
};

const StatBox = ({ label, count }: { label: string; count: number }) => (
  <View style={styles.statBox}>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: colors.darkGray,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginLeft: 20,
  },
  statBox: {
    alignItems: "center",
  },
  statCount: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: colors.white,
    fontSize: 13,
  },
  bioContainer: {
    marginTop: 12,
  },
  displayName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "bold",
  },
  bio: {
    color: colors.white,
    fontSize: 14,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.darkGray,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  followButton: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  followButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  tabs: {
      flexDirection: "row",
      marginTop: 20,
      borderTopWidth: 0.5,
      borderTopColor: colors.darkGray,
  },
  tab: {
      flex: 1,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
  },
  activeTab: {
      borderBottomWidth: 1.5,
      borderBottomColor: colors.white,
  },
  postThumbnail: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    padding: 0.5,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.darkGray,
  },
  headerUsername: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
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
});

export default ProfileScreen;
