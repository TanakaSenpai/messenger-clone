import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useContext } from "react";
import { AuthContext } from "app/auth/context";
import {
  Story,
  createStory,
  subscribeToStories,
  deleteStory,
} from "app/api/stories";
import colors from "app/configs/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface UserStories {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  hasUnviewed: boolean;
}

const Stories = () => {
  const { user } = useContext(AuthContext);
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);
  const [storyIndex, setStoryIndex] = useState<number>(0);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStories((stories) => {
      const grouped = groupStoriesByUser(stories);
      setUserStories(grouped);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const groupStoriesByUser = (stories: Story[]): UserStories[] => {
    const userMap = new Map<string, UserStories>();

    for (const story of stories) {
      if (!userMap.has(story.userId)) {
        userMap.set(story.userId, {
          userId: story.userId,
          userName: story.userName,
          userAvatar: story.userAvatar,
          stories: [],
          hasUnviewed: true,
        });
      }
      userMap.get(story.userId)!.stories.push(story);
    }

    return Array.from(userMap.values());
  };

  const handleAddStory = async () => {
    Alert.alert(
      "Add Story",
      "Choose how to add a story",
      [
        {
          text: "Camera",
          onPress: () => pickMedia("camera"),
        },
        {
          text: "Gallery",
          onPress: () => pickMedia("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const pickMedia = async (source: "camera" | "gallery") => {
    try {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Camera permission is needed");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.8,
          allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadStory(result.assets[0]);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Gallery permission is needed");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.8,
          allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadStory(result.assets[0]);
        }
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to pick media");
    }
  };

  const uploadStory = async (asset: { uri: string; type?: string }) => {
    setIsUploading(true);
    try {
      const mediaType = asset.type?.includes("video")
        ? "video"
        : "image";
      await createStory(asset.uri, mediaType);
      Alert.alert("Success", "Story added!");
    } catch (error: any) {
      console.error("Error creating story:", error);
      Alert.alert("Error", error.message || "Failed to create story");
    } finally {
      setIsUploading(false);
    }
  };

  const openStory = (userIndex: number, storyIdx: number) => {
    setSelectedUserIndex(userIndex);
    setStoryIndex(storyIdx);
    setSelectedStory(userStories[userIndex].stories[storyIdx]);
    setIsViewerVisible(true);
  };

  const nextStory = () => {
    const currentUser = userStories[selectedUserIndex];
    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      setSelectedStory(currentUser.stories[storyIndex + 1]);
    } else {
      // Move to next user's first story
      if (selectedUserIndex < userStories.length - 1) {
        setSelectedUserIndex(selectedUserIndex + 1);
        setStoryIndex(0);
        setSelectedStory(userStories[selectedUserIndex + 1].stories[0]);
      } else {
        setIsViewerVisible(false);
      }
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setSelectedStory(userStories[selectedUserIndex].stories[storyIndex - 1]);
    } else {
      // Move to previous user's last story
      if (selectedUserIndex > 0) {
        const prevUser = userStories[selectedUserIndex - 1];
        setSelectedUserIndex(selectedUserIndex - 1);
        setStoryIndex(prevUser.stories.length - 1);
        setSelectedStory(prevUser.stories[prevUser.stories.length - 1]);
      }
    }
  };

  const handleDeleteStory = async () => {
    if (!selectedStory) return;

    Alert.alert(
      "Delete Story",
      "Are you sure you want to delete this story?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStory(selectedStory.id);
              setIsViewerVisible(false);
            } catch (error) {
              console.error("Error deleting story:", error);
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stories Header */}
      <View style={styles.storiesHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScroll}
        >
          {/* My Story */}
          <TouchableOpacity
            style={styles.storyCircle}
            onPress={handleAddStory}
            disabled={isUploading}
          >
            <View style={styles.myStoryContainer}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, styles.avatarImage]}>
                  <Text style={styles.avatarInitial}>
                    {user?.firstName?.charAt(0) || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.addStoryIcon}>
                <Text style={styles.addIconText}>+</Text>
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              My Story
            </Text>
          </TouchableOpacity>

          {/* Other Users' Stories */}
          {userStories
            .filter((u) => u.userId !== user?.uid)
            .map((userStory, index) => (
              <TouchableOpacity
                key={userStory.userId}
                style={styles.storyCircle}
                onPress={() => openStory(index + 1, 0)}
              >
                <View
                  style={[
                    styles.storyRing,
                    userStory.hasUnviewed && styles.unviewedStoryRing,
                  ]}
                >
                  {userStory.userAvatar ? (
                    <Image
                      source={{ uri: userStory.userAvatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, styles.avatarImage]}>
                      <Text style={styles.avatarInitial}>
                        {userStory.userName.charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>
                  {userStory.userName.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Empty State */}
      {userStories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stories yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "My Story" to add your first story
          </Text>
        </View>
      )}

      {/* Story Viewer Modal */}
      <Modal
        visible={isViewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsViewerVisible(false)}
      >
        <Pressable
          style={styles.viewerContainer}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            if (x < SCREEN_WIDTH / 3) {
              prevStory();
            } else if (x > (SCREEN_WIDTH * 2) / 3) {
              nextStory();
            }
          }}
        >
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            {selectedStory &&
              userStories[selectedUserIndex]?.stories.map((_, idx) => (
                <View key={idx} style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      idx <= storyIndex && styles.progressBarComplete,
                    ]}
                  />
                </View>
              ))}
          </View>

          {/* Header */}
          <View style={styles.viewerHeader}>
            {selectedStory?.userAvatar ? (
              <Image
                source={{ uri: selectedStory.userAvatar }}
                style={styles.viewerAvatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, styles.viewerAvatar]} />
            )}
            <Text style={styles.viewerUserName}>
              {selectedStory?.userName}
            </Text>
            <Text style={styles.viewerTime}>
              {selectedStory && formatTimeAgo(selectedStory.createdAt)}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsViewerVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {selectedStory && (
            <>
              {selectedStory.mediaType === "image" ? (
                <Image
                  source={{ uri: selectedStory.mediaUrl }}
                  style={viewerMediaStyle}
                  resizeMode="contain"
                />
              ) : (
                <Video
                  source={{ uri: selectedStory.mediaUrl }}
                  style={viewerMediaStyle}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping={false}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded && status.didJustFinish) {
                      nextStory();
                    }
                  }}
                />
              )}
            </>
          )}

          {/* Actions */}
          {selectedStory?.userId === user?.uid && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteStory}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Modal>

      {/* Upload Loading */}
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.uploadingText}>Uploading story...</Text>
        </View>
      )}
    </View>
  );
};

const viewerMediaStyle = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT * 0.7,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  storiesHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.darkGray,
  },
  storiesScroll: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  storyCircle: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 70,
  },
  myStoryContainer: {
    position: "relative",
  },
  storyRing: {
    borderWidth: 3,
    borderColor: colors.darkGray,
    borderRadius: 35,
    padding: 2,
  },
  unviewedStoryRing: {
    borderColor: colors.blue,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  addStoryIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.blue,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.black,
  },
  addIconText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  storyName: {
    color: colors.white,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.lightGray,
    fontSize: 14,
    marginTop: 8,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  progressBarContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 50,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 1,
  },
  progressBarComplete: {
    backgroundColor: colors.white,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewerUserName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  viewerTime: {
    color: colors.lightGray,
    fontSize: 14,
    marginLeft: 10,
  },
  closeButton: {
    marginLeft: "auto",
    padding: 5,
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 20,
  },
  deleteButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: colors.white,
    marginTop: 10,
    fontSize: 16,
  },
});

export default Stories;