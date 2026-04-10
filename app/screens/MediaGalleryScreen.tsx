import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { subscribeToMessages, ChatMessageRecord } from "app/api/messages";
import { supabase } from "app/configs/supabase";
import { BUCKET } from "app/api/storageSupabase";
import { Video, ResizeMode } from "expo-av";
import colors from "app/configs/colors";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = width / 3;

type MediaGalleryScreenRouteProp = RouteProp<RootStackParamList, "MediaGallery">;

interface Props {
  route: MediaGalleryScreenRouteProp;
}

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  size?: number;
}

interface LinkItem {
  id: string;
  url: string;
  title?: string;
}

const MediaGalleryScreen = ({ route }: Props) => {
  const { conversationId } = route.params;
  const [activeTab, setActiveTab] = useState<"media" | "files" | "links">("media");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  
  const signedUrlCache = useRef<Map<string, string>>(new Map());
  const [viewer, setViewer] = useState<{
    visible: boolean;
    type: "image" | "video";
    uri: string;
  } | null>(null);

  // Viewer animation states
  const viewerPanY = useRef(new Animated.Value(0)).current;
  const viewerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) viewerPanY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          setViewer(null);
          viewerPanY.setValue(0);
        } else {
          Animated.spring(viewerPanY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(viewerPanY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      // 1. Process Media
      const mediaMessages = messages.filter(
        (m) => m.type === "image" || m.type === "video"
      );
      const mItems: MediaItem[] = mediaMessages.map((m) => ({
        id: m.id,
        url: m.mediaUrl || "",
        type: m.type as "image" | "video",
      }));

      // 2. Process Files
      const fileMessages = messages.filter((m) => m.type === "file");
      const fItems: FileItem[] = fileMessages.map((m) => ({
        id: m.id,
        name: m.content || "Unnamed File",
        url: m.mediaUrl || "",
      }));

      // 3. Process Links
      const lItems: LinkItem[] = [];
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      messages.forEach((m) => {
        if (m.type === "text" && m.content) {
          const matches = m.content.match(linkRegex);
          if (matches) {
            matches.forEach((url) => {
              lItems.push({ id: `${m.id}-${url}`, url });
            });
          }
        }
      });

      setFiles(fItems);
      setLinks(lItems);

      // Media Signed URLs
      mItems.forEach(async (item) => {
        if (item.url && !/^https?:\/\//.test(item.url)) {
          let path = item.url.trim();
          if (path.startsWith(`${BUCKET}/`)) {
            path = path.slice(`${BUCKET}/`.length);
          } else if (BUCKET === "conversations" && path.startsWith("conversations/")) {
            path = path.slice("conversations/".length);
          }

          const cached = signedUrlCache.current.get(path);
          if (cached) {
            setMedia((prev) =>
              prev.map((pm) => (pm.id === item.id ? { ...pm, url: cached } : pm))
            );
            return;
          }

          try {
            const { data, error } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, 60 * 60);
            if (!error && data?.signedUrl) {
              signedUrlCache.current.set(path, data.signedUrl);
              setMedia((prev) =>
                prev.map((pm) =>
                  pm.id === item.id ? { ...pm, url: data.signedUrl } : pm
                )
              );
            }
          } catch (err) {
            console.error("Failed to re-sign URL in MediaGallery", err);
          }
        }
      });

      const withCached = mItems.map((m) => {
        if (m.url && !/^https?:\/\//.test(m.url)) {
          const cached = signedUrlCache.current.get(m.url);
          if (cached) return { ...m, url: cached };
        }
        return m;
      });
      setMedia(withCached);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.mediaContainer}
      onPress={() => setViewer({ visible: true, type: item.type, uri: item.url })}
    >
      {item.type === "image" ? (
        <Image source={{ uri: item.url }} style={styles.media} />
      ) : (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: item.url }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
          />
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={24} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.fileItem}>
      <View style={styles.fileIconContainer}>
        <Ionicons name="document-text" size={24} color={colors.blue} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileSub}>Shared from conversation</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLinkItem = ({ item }: { item: LinkItem }) => (
    <TouchableOpacity style={styles.linkItem}>
      <View style={styles.linkIconContainer}>
        <Ionicons name="link" size={20} color={colors.white} />
      </View>
      <View style={styles.linkInfo}>
        <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <TabButton 
          label="MEDIA" 
          active={activeTab === "media"} 
          onPress={() => setActiveTab("media")} 
        />
        <TabButton 
          label="FILES" 
          active={activeTab === "files"} 
          onPress={() => setActiveTab("files")} 
        />
        <TabButton 
          label="LINKS" 
          active={activeTab === "links"} 
          onPress={() => setActiveTab("links")} 
        />
      </View>

      {activeTab === "media" && (
        <FlatList
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === "files" && (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No files shared yet</Text>}
        />
      )}

      {activeTab === "links" && (
        <FlatList
          data={links}
          renderItem={renderLinkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No links shared yet</Text>}
        />
      )}

      {viewer?.visible && (
        <Modal
          visible={viewer.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setViewer(null)}
        >
          <View style={styles.viewerBackdrop}>
            <TouchableOpacity
              style={styles.viewerCloseArea}
              activeOpacity={1}
              onPress={() => setViewer(null)}
            />
            <Animated.View
              style={[
                styles.viewerContent,
                { transform: [{ translateY: viewerPanY }] },
              ]}
              {...viewerPan.panHandlers}
            >
              {viewer.type === "image" ? (
                <Image
                  source={{ uri: viewer.uri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              ) : (
                <Video
                  source={{ uri: viewer.uri }}
                  style={styles.viewerVideo}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              )}
            </Animated.View>
            <TouchableOpacity
              style={styles.viewerCloseButton}
              onPress={() => setViewer(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const TabButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tabButton, active && styles.tabButtonActive]} 
    onPress={onPress}
  >
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.darkGray,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: colors.blue,
  },
  tabLabel: {
    color: colors.mediumGray,
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: colors.blue,
  },
  listContent: {
    paddingBottom: 20,
  },
  mediaContainer: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    padding: 1,
  },
  media: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  playIconOverlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 5,
  },
  emptyText: {
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  fileSub: {
    color: colors.mediumGray,
    fontSize: 13,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  linkIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  linkInfo: {
    flex: 1,
  },
  linkUrl: {
    color: colors.blue,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerCloseArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  viewerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerVideo: {
    width: "100%",
    height: "100%",
  },
  viewerCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
  },
});

export default MediaGalleryScreen;
