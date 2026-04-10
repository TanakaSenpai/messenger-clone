import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";
import Ionicons from "react-native-vector-icons/Ionicons";
import colors from "app/configs/colors";
import { createPost } from "app/api/posts";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "app/navigation/types";

type CreatePostScreenNavigationProp = StackNavigationProp<RootStackParamList, "CreatePost">;

interface Props {
  navigation: CreatePostScreenNavigationProp;
}

const CreatePostScreen = ({ navigation }: Props) => {
  const [mediaAssets, setMediaAssets] = useState<{ uri: string; type: "image" | "video" }[]>([]);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async (source: "camera" | "gallery") => {
    try {
      const permissionResult = source === "camera" 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== "granted") {
        Alert.alert("Permission denied", `You need to grant ${source} permission.`);
        return;
      }

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images", "videos"],
            allowsMultipleSelection: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "videos"],
            allowsMultipleSelection: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaAssets(result.assets.map(a => ({
          uri: a.uri,
          type: (a.type as "image" | "video") || "image"
        })));
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to pick media.");
    }
  };

  const handleShare = async () => {
    if (mediaAssets.length === 0) {
      Alert.alert("Error", "Please select at least one photo or video.");
      return;
    }

    setIsUploading(true);
    try {
      await createPost(mediaAssets, caption);
      Alert.alert("Success", "Post shared successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Feed") }
      ]);
      setMediaAssets([]);
      setCaption("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to share post.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity onPress={handleShare} disabled={isUploading}>
          <Text style={[styles.shareText, isUploading && styles.disabledText]}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mediaPreviewContainer}>
          {mediaAssets.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {mediaAssets.map((asset, index) => (
                <View key={index} style={styles.mediaPreviewItem}>
                  <Image source={{ uri: asset.uri }} style={styles.mediaPreview} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.placeholderContainer}>
              <TouchableOpacity style={styles.pickerButton} onPress={() => pickMedia("gallery")}>
                <Ionicons name="images" size={40} color={colors.mediumGray} />
                <Text style={styles.pickerText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerButton} onPress={() => pickMedia("camera")}>
                <Ionicons name="camera" size={40} color={colors.mediumGray} />
                <Text style={styles.pickerText}>Take a Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={colors.mediumGray}
            multiline
            value={caption}
            onChangeText={setCaption}
          />
        </View>

        {mediaAssets.length > 0 && (
          <TouchableOpacity style={styles.changeButton} onPress={() => setMediaAssets([])}>
            <Text style={styles.changeButtonText}>Clear Media</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Sharing your post...</Text>
        </View>
      )}
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.darkGray,
  },
  cancelText: {
    color: colors.white,
    fontSize: 16,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  shareText: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledText: {
    color: colors.mediumGray,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mediaPreviewContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1a1a1a",
  },
  mediaPreviewItem: {
    width: Dimensions.get("window").width,
    aspectRatio: 1,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  pickerButton: {
    alignItems: "center",
  },
  pickerText: {
    color: colors.mediumGray,
    marginTop: 8,
    fontSize: 12,
  },
  inputContainer: {
    padding: 16,
    minHeight: 100,
  },
  captionInput: {
    color: colors.white,
    fontSize: 16,
    textAlignVertical: "top",
  },
  changeButton: {
    alignSelf: "center",
    padding: 10,
    marginTop: 20,
  },
  changeButtonText: {
    color: colors.blue,
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    color: colors.white,
    marginTop: 10,
    fontSize: 16,
  },
});

export default CreatePostScreen;
