import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Animated,
  Easing,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  ActivityIndicator,
} from "react-native";
import { PanResponder } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import * as ImagePicker from "expo-image-picker";
import {
  buildConversationId,
  ensureConversationDoc,
  sendMessageToConversation,
  subscribeToMessages,
  ChatMessageRecord,
  sendMediaMessageToConversation,
  markMessageSent,
  markMessageSeen,
} from "app/api/messages";
import { uploadFileFromUriSupabase, BUCKET } from "app/api/storageSupabase";
import { supabase } from "app/configs/supabase";
import { Video, ResizeMode } from "expo-av";
import { useContext, useMemo } from "react";
import { AuthContext } from "app/auth/context";
import { serverTimestamp, Timestamp } from "firebase/firestore";

interface Message {
  // Exact schema fields
  id: string;
  conversationId?: string;
  senderId?: string;
  receiverId?: string;
  type?: "text" | "image" | "video" | "file";
  content?: string | null;
  mediaUrl?: string | null;
  status?: "sent" | "delivered" | "seen";
  createdAtTS?: Timestamp;
  sentAtTS?: Timestamp | null;
  deliveredAtTS?: Timestamp | null;
  seenAtTS?: Timestamp | null;

  // UI derived fields for existing rendering code
  text: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  mediaType?: "image" | "video";
}

const ConvoScreen = ({
  route,
}: {
  route: RouteProp<RootStackParamList, "Conversation">;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [iconsHidden, setIconsHidden] = useState(false);
  const [iconsReady, setIconsReady] = useState(false);
  const [arrowVisible, setArrowVisible] = useState(false);
  const iconsAnim = useRef(new Animated.Value(1)).current; // 1 visible, 0 hidden
  const leftIconsWidthAnim = useRef(new Animated.Value(0)).current; // animated width for left icons
  const iconsMeasuredWidthRef = useRef<number | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const prevLengthRef = useRef<number>(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const inputTextRef = useRef<string>("");
  // Cache signed URLs across renders
  const signedUrlCache = useRef<Map<string, string>>(new Map());

  const [viewer, setViewer] = useState<{
    visible: boolean;
    type: "image" | "video";
    uri: string;
  } | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [sentFooter, setSentFooter] = useState<string | null>(null);
  // Viewer swipe-to-close
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

  const headerHeight = useHeaderHeight();
  const { chat } = route.params;
  const { user: currentUser } = useContext(AuthContext);
  const otherUserUid = String(chat.id);

  // Keep ref in sync with input state
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Auto-hide sent footer after a short delay
  useEffect(() => {
    if (!sentFooter) return;
    const t = setTimeout(() => setSentFooter(null), 2500);
    return () => clearTimeout(t);
  }, [sentFooter]);

  const conversationId = useMemo(() => {
    const otherId = String(chat.id);
    const me = currentUser?.uid ?? "anonymous";
    return buildConversationId(me, otherId);
  }, [chat.id, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let unsubscribe: (() => void) | undefined;
    // signedUrlCache is kept between renders
    (async () => {
      try {
        await ensureConversationDoc(conversationId, [
          currentUser.uid,
          String(chat.id),
        ]);
      } catch {}
      unsubscribe = subscribeToMessages(conversationId, (records) => {
        // On receiver device: when online/subscribed, advance delivered -> sent
        records.forEach((r) => {
          if (r.senderId !== currentUser.uid && r.status === "delivered" && r.id) {
            // Attach a catch handler to capture permission/rules errors
            markMessageSent(conversationId, r.id).catch((e) => {
              console.error("Failed to mark message as sent", { conversationId, messageId: r.id, error: e });
            });
          }
        });

        const mapped: Message[] = records.map((r) => ({
          id: (r as any).id || Math.random().toString(),
          text: ((r as any).content ?? "") as string,
          timestamp: (r.createdAt as any)?.toDate
            ? (r.createdAt as any).toDate()
            : new Date(),
          status: (r as any).status as any,
          sentAtTS: (r as any).sentAt as any,
          deliveredAtTS: (r as any).deliveredAt as any,
          seenAtTS: (r as any).seenAt as any,
          user: {
            id: r.senderId,
            name: r.senderId === currentUser.uid ? "You" : (chat.name as string),
            avatar: r.senderId === currentUser.uid ? undefined : (chat.avatar as any),
          },
          mediaUrl: (r as any).mediaUrl ?? null,
          mediaType: (r as any).type === "image" || (r as any).type === "video" ? (r as any).type : undefined,
        }));

        // Generate signed URLs for private bucket paths (images and videos)
        mapped.forEach(async (m) => {
          if (m.mediaUrl && m.mediaType && !/^https?:\/\//.test(m.mediaUrl)) {
            // Normalize object key: remove bucket prefix if present
            let path = m.mediaUrl.trim();
            if (path.startsWith(`${BUCKET}/`)) {
              path = path.slice(`${BUCKET}/`.length);
            } else if (
              BUCKET === "conversations" &&
              path.startsWith("conversations/")
            ) {
              path = path.slice("conversations/".length);
            }
            const cached = signedUrlCache.current.get(path);
            if (cached) {
              setMessages((prev) =>
                prev.map((pm) =>
                  pm.id === m.id ? { ...pm, mediaUrl: cached } : pm
                )
              );
              return;
            }
            try {
              const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(path, 60 * 60); // 1 hour
              if (!error && data?.signedUrl) {
                signedUrlCache.current.set(path, data.signedUrl);
                setMessages((prev) =>
                  prev.map((pm) =>
                    pm.id === m.id ? { ...pm, mediaUrl: data.signedUrl } : pm
                  )
                );
              } else {
                console.error("Failed to create signed URL", { path, error });
              }
            } catch (err) {
              console.error("Exception creating signed URL", { path, err });
            }
          }
        });

        // Prefer cached signed URLs in initial mapped data to avoid overwriting later async updates
        const withCached = mapped.map((m) => {
          if (m.mediaUrl && m.mediaType && !/^https?:\/\//.test(m.mediaUrl)) {
            const cached = signedUrlCache.current.get(m.mediaUrl);
            if (cached) return { ...m, mediaUrl: cached };
          }
          return m;
        });

        // Only update if messages actually changed to prevent unnecessary re-renders
        setMessages((prev) => {
          // Check if messages are actually different
          if (prev.length !== withCached.length) return withCached;

          // Check if any message content changed
          for (let i = 0; i < prev.length; i++) {
            const a = prev[i];
            const b = withCached[i];
            if (
              a.id !== b.id ||
              a.text !== b.text ||
              a.mediaUrl !== b.mediaUrl ||
              a.mediaType !== b.mediaType ||
              a.status !== (b as any).status ||
              (a.seenAtTS as any)?.seconds !== (b as any)?.seenAtTS?.seconds ||
              (a.deliveredAtTS as any)?.seconds !== (b as any)?.deliveredAtTS?.seconds ||
              (a.sentAtTS as any)?.seconds !== (b as any)?.sentAtTS?.seconds
            ) {
              return withCached;
            }
          }
          return prev; // no change
        });
      });
    })();
    return () => unsubscribe && unsubscribe();
  }, [conversationId, currentUser?.uid, chat.id, chat.name, chat.avatar]);

  // When viewing this conversation, mark latest other-user message as seen
  useEffect(() => {
    if (!currentUser?.uid) return;
    const lastIncoming = [...messages].reverse().find((m) => m.user.id !== currentUser.uid);
    if (lastIncoming && lastIncoming.id && lastIncoming.status !== "seen") {
      try { markMessageSeen(conversationId, lastIncoming.id); } catch {}
    }
  }, [messages, currentUser?.uid, conversationId]);

  // Smooth scroll to end when new messages arrive or are sent
  useEffect(() => {
    if (messages.length > prevLengthRef.current && autoScroll) {
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToEnd({ animated: true })
      );
      prevLengthRef.current = messages.length;
    } else {
      prevLengthRef.current = messages.length;
    }
  }, [messages, autoScroll]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setAutoScroll(distanceFromBottom < 120);
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUser?.uid || !otherUserUid) {
      return;
    }

    const text = inputText.trim();
    inputTextRef.current = text;

    // Clear input for UX
    setInputText("");

    // Temporary message for optimistic UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      text,
      timestamp: new Date(),
      user: {
        id: currentUser.uid,
        name: currentUser.firstName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.email,
        avatar: currentUser.avatar,
      },
    };

    // Show temp message immediately
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Send message to Firebase
      await sendMessageToConversation(conversationId, text, {
        uid: currentUser.uid,
        name: currentUser.firstName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.email,
        avatar: currentUser.avatar,
      }); // participants are derived from conversationId internally

      // Remove temp message after successful send
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } catch (e) {
      console.error("Failed to send message:", e);

      if (
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof e.message === "string" &&
        e.message.includes("permissions")
      ) {
        console.error(
          "This is a Firestore permissions issue. Check your security rules."
        );
        console.error("The conversationId being used:", conversationId);
        console.error("Current user UID:", currentUser?.uid);
      }

      // Restore input so user can retry
      setInputText(inputTextRef.current);

      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  }, [
    conversationId,
    currentUser?.uid,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.avatar,
    inputText,
    otherUserUid,
  ]);

  // Capture photo with camera, upload, and send as image message
  const captureAndSendPhoto = useCallback(async () => {
    try {
      if (!currentUser?.uid) return;

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const localUri = asset.uri;
      const tempId = `temp-img-${Date.now()}`;
      setUploadingMap((m) => ({ ...m, [tempId]: true }));

      // Optimistic message
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: "",
          timestamp: new Date(),
          user: {
            id: currentUser.uid,
            name: currentUser.firstName
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : currentUser.email,
            avatar: currentUser.avatar,
          },
          mediaUrl: localUri,
          mediaType: "image",
        } as Message,
      ]);

      const { path } = await uploadFileFromUriSupabase({
        fileUri: localUri,
        kind: "image",
        conversationId,
        uploaderUid: currentUser.uid,
      });

      await sendMediaMessageToConversation(
        conversationId,
        { url: path, type: "image" },
        {
          uid: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        }
      );

      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setUploadingMap((m) => {
        const { [tempId]: _, ...rest } = m;
        return rest;
      });
      setSentFooter('Sent');
    } catch (e) {
      console.error("captureAndSendPhoto error:", e);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-img-")));
      setUploadingMap((m) => {
        const next = { ...m };
        Object.keys(next).forEach((k) => {
          if (k.startsWith('temp-img-')) delete next[k];
        });
        return next;
      });
    }
  }, [
    conversationId,
    currentUser?.uid,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.avatar,
  ]);

  // Pick an image from library, upload to storage, and send as a media message
  const pickAndSendImage = useCallback(async () => {
    try {
      if (!currentUser?.uid) return;

      // Request permission if needed
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const localUri = asset.uri;

      // Optimistic temp message with local image URI
      const tempId = `temp-img-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        text: "",
        timestamp: new Date(),
        user: {
          id: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        },
        mediaUrl: localUri,
        mediaType: "image",
      };
      setMessages((prev) => [...prev, tempMessage]);

      // Upload to Supabase Storage and get storage path (we'll sign it to view)
      const { path } = await uploadFileFromUriSupabase({
        fileUri: localUri,
        kind: "image",
        conversationId,
        uploaderUid: currentUser.uid,
        // Include both participants so SELECT policy allows both to read
        participants: [currentUser.uid, String(chat.id)],
      });

      // Store the storage object key in Firestore; UI will generate a signed URL at render time
      await sendMediaMessageToConversation(
        conversationId,
        { url: path, type: "image" },
        {
          uid: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        }
      );

      // Remove temp message after successful send
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } catch (e) {
      console.error("pickAndSendImage error:", e);
      // Clean up any temp messages
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-img-")));
    }
  }, [
    conversationId,
    currentUser?.uid,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.avatar,
  ]);

  // Single picker for photo or video via gallery (camera icon)
  const pickAndSendMedia = useCallback(async () => {
    try {
      if (!currentUser?.uid) return;

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const localUri = asset.uri;
      const isVideo = asset.type === "video";
      const tempId = `temp-${isVideo ? 'vid' : 'img'}-${Date.now()}`;
      setUploadingMap((m) => ({ ...m, [tempId]: true }));

      // Optimistic temp message with local uri as mediaUrl
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: "",
          timestamp: new Date(),
          user: {
            id: currentUser.uid,
            name: currentUser.firstName
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : currentUser.email,
            avatar: currentUser.avatar,
          },
          mediaUrl: localUri,
          mediaType: isVideo ? "video" : "image",
        } as Message,
      ]);

      // Upload
      const { path } = await uploadFileFromUriSupabase({
        fileUri: localUri,
        kind: isVideo ? "video" : "image",
        conversationId,
        uploaderUid: currentUser.uid,
      });

      // Send message referencing storage path
      await sendMediaMessageToConversation(
        conversationId,
        { url: path, type: isVideo ? "video" : "image" },
        {
          uid: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        }
      );

      // Remove temp
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setUploadingMap((m) => {
        const { [tempId]: _, ...rest } = m;
        return rest;
      });
      setSentFooter('Sent');
    } catch (e) {
      console.error("pickAndSendMedia error:", e);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      setUploadingMap((m) => {
        const next = { ...m };
        Object.keys(next).forEach((k) => {
          if (k.startsWith('temp-')) delete next[k];
        });
        return next;
      });
    }
  }, [
    conversationId,
    currentUser?.uid,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.avatar,
  ]);

  // Pick a video, upload, and send as media message
  const pickAndSendVideo = useCallback(async () => {
    try {
      if (!currentUser?.uid) return;

      // Request media library permission
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return;

      const result = await ImagePicker.launchImageLibraryAsync({
        // Use All to ensure videos appear in some OEM pickers
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      // Only continue if a video was picked
      if (asset.type !== "video") {
        return;
      }

      const localUri = asset.uri;

      const tempId = `temp-vid-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        text: "",
        timestamp: new Date(),
        user: {
          id: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        },
        mediaUrl: localUri,
        mediaType: "video",
      };
      setMessages((prev) => [...prev, tempMessage]);

      const { path } = await uploadFileFromUriSupabase({
        fileUri: localUri,
        kind: "video",
        conversationId,
        uploaderUid: currentUser.uid,
        participants: [currentUser.uid, String(chat.id)],
      });

      await sendMediaMessageToConversation(
        conversationId,
        { url: path, type: "video" },
        {
          uid: currentUser.uid,
          name: currentUser.firstName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.email,
          avatar: currentUser.avatar,
        }
      );

      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } catch (e) {
      console.error("pickAndSendVideo error:", e);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-vid-")));
    }
  }, [
    conversationId,
    currentUser?.uid,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.avatar,
  ]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffInDays === 0)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatDateHeader = (date: Date) =>
    date
      .toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .toUpperCase();

  const shouldShowTimeHeader = (prev?: Message, curr?: Message) => {
    if (!curr) return false;
    if (!prev) return true;
    const prevDate = new Date(prev.timestamp);
    const currDate = new Date(curr.timestamp);
    if (prevDate.toDateString() !== currDate.toDateString()) return true;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    return Math.abs(currDate.getTime() - prevDate.getTime()) >= FIFTEEN_MINUTES;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const previous = index > 0 ? messages[index - 1] : undefined;
    const showTimeHeader = shouldShowTimeHeader(previous, item);
    const isCurrentUser =
      !!currentUser?.uid && item.user.id === currentUser.uid;

    return (
      <View>
        {showTimeHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {formatDateHeader(item.timestamp)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isCurrentUser
              ? styles.myMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          {!isCurrentUser && (
            <View style={styles.avatarContainer}>
              {item.user.avatar ? (
                <Image
                  source={{ uri: item.user.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View
            style={{
              flexDirection: "column",
              alignItems: isCurrentUser ? "flex-end" : "flex-start",
              flex: 1,
            }}
          >
            {item.mediaUrl ? (
              item.mediaType === "image" ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    setViewer({
                      visible: true,
                      type: "image",
                      uri: item.mediaUrl!,
                    })
                  }
                >
                  <View
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "#222",
                      marginBottom: item.text ? 6 : 4,
                    }}
                  >
                    {loadingMap[item.id] && (
                      <View
                        style={{
                          ...(StyleSheet.absoluteFillObject as any),
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator color="#888" />
                      </View>
                    )}
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                      onLoadStart={() =>
                        setLoadingMap((m) => ({ ...m, [item.id]: true }))
                      }
                      onLoadEnd={() =>
                        setLoadingMap((m) => ({ ...m, [item.id]: false }))
                      }
                      onError={async () => {
                        try {
                          const uri = item.mediaUrl || "";
                          let objectKey = uri;
                          if (/^https?:\/\//.test(uri)) {
                            const match = uri.match(
                              /\/object\/sign\/(.*?)\/(.*?)(\?|$)/
                            );
                            if (match) {
                              const b = decodeURIComponent(match[1]);
                              const k = decodeURIComponent(match[2]);
                              if (b === BUCKET) objectKey = k;
                            }
                          } else if (objectKey.startsWith(`${BUCKET}/`)) {
                            objectKey = objectKey.slice(`${BUCKET}/`.length);
                          } else if (
                            BUCKET === "conversations" &&
                            objectKey.startsWith("conversations/")
                          ) {
                            objectKey = objectKey.slice(
                              "conversations/".length
                            );
                          }
                          const { data, error } = await supabase.storage
                            .from(BUCKET)
                            .createSignedUrl(objectKey, 60 * 60);
                          if (!error && data?.signedUrl) {
                            signedUrlCache.current.set(
                              objectKey,
                              data.signedUrl
                            );
                            setMessages((prev) =>
                              prev.map((pm) =>
                                pm.id === item.id
                                  ? { ...pm, mediaUrl: data.signedUrl }
                                  : pm
                              )
                            );
                          } else {
                            console.error("Image re-sign failed", {
                              objectKey,
                              error,
                            });
                          }
                        } catch (e) {
                          console.error("Exception in onError re-sign", e);
                        }
                      }}
                    />
                    {/* Sending overlay for images */}
                    {uploadingMap[item.id] && (
                      <View style={styles.sendingOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.sendingText}>Sending…</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    setViewer({
                      visible: true,
                      type: "video",
                      uri: item.mediaUrl!,
                    })
                  }
                >
                  <View
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "#111",
                      marginBottom: item.text ? 6 : 4,
                    }}
                  >
                    {loadingMap[item.id] && (
                      <View
                        style={{
                          ...(StyleSheet.absoluteFillObject as any),
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator color="#888" />
                      </View>
                    )}
                    <Video
                      source={{ uri: item.mediaUrl! }}
                      style={{ width: "100%", height: "100%" }}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      isLooping={false}
                      onLoadStart={() =>
                        setLoadingMap((m) => ({ ...m, [item.id]: true }))
                      }
                      onLoad={() =>
                        setLoadingMap((m) => ({ ...m, [item.id]: false }))
                      }
                      onError={() => {
                        (async () => {
                          try {
                            let objectKey = item.mediaUrl || "";
                            if (/^https?:\/\//.test(objectKey)) {
                              const match = objectKey.match(
                                /\/object\/sign\/(.*?)\/(.*?)(\?|$)/
                              );
                              if (match) {
                                const b = decodeURIComponent(match[1]);
                                const k = decodeURIComponent(match[2]);
                                if (b === BUCKET) objectKey = k;
                              }
                            } else if (objectKey.startsWith(`${BUCKET}/`)) {
                              objectKey = objectKey.slice(`${BUCKET}/`.length);
                            } else if (
                              BUCKET === "conversations" &&
                              objectKey.startsWith("conversations/")
                            ) {
                              objectKey = objectKey.slice(
                                "conversations/".length
                              );
                            }
                            const { data, error } = await supabase.storage
                              .from(BUCKET)
                              .createSignedUrl(objectKey, 60 * 60);
                            if (!error && data?.signedUrl) {
                              signedUrlCache.current.set(
                                objectKey,
                                data.signedUrl
                              );
                              setMessages((prev) =>
                                prev.map((pm) =>
                                  pm.id === item.id
                                    ? { ...pm, mediaUrl: data.signedUrl }
                                    : pm
                                )
                              );
                            } else {
                              console.error("Video re-sign failed", {
                                objectKey,
                                error,
                              });
                            }
                          } catch (e) {
                            console.error(
                              "Exception in video onError re-sign",
                              e
                            );
                          }
                        })();
                      }}
                    />
                    {/* Play badge overlay */}
                    <View style={styles.playIconWrapper}>
                      <Ionicons name="play" size={28} color="#fff" />
                    </View>
                    {/* Sending overlay for videos */}
                    {uploadingMap[item.id] && (
                      <View style={styles.sendingOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.sendingText}>Sending…</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            ) : null}

            {!!item.text && (
              <View
                style={[
                  styles.messageBubble,
                  isCurrentUser
                    ? styles.myMessageBubble
                    : styles.otherMessageBubble,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Animate hide/show of left icons and expand/collapse input
  const slideOutLeftIcons = (): void => {
    if (!iconsReady || iconsMeasuredWidthRef.current == null) return;
    setArrowVisible(true);
    Animated.parallel([
      Animated.timing(iconsAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(leftIconsWidthAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => finished && setIconsHidden(true));
  };

  const slideInLeftIcons = (): void => {
    if (!iconsReady) return;
    const w = iconsMeasuredWidthRef.current ?? 0;
    setIconsHidden(false);
    Animated.parallel([
      Animated.timing(iconsAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(leftIconsWidthAnim, {
        toValue: w,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => setArrowVisible(false));
  };

  // Animated styles for left icons
  const leftIconsAnimatedStyle = {
    opacity: iconsAnim,
    transform: [
      {
        translateX: iconsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-24, 0],
        }),
      },
    ],
  } as const;

  // Time formatting per spec: minutes for <1h; Xh for <24h; 'yesterday' for 24–47h; X days for 48h+
  const formatRelativeTime = (from: Date): string => {
    const now = new Date();
    const ms = now.getTime() - from.getTime();
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (hours < 1) return `${Math.max(1, minutes)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return "yesterday";
    return `${days} days ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => {
              // Wrap bubble + status line under the last outgoing message
              const isMine = item.user.id === currentUser?.uid;
              const isLast = index === messages.length - 1;

              let statusText: string | null = null;
              if (isMine && isLast) {
                if (item.id?.startsWith?.("temp-")) {
                  statusText = "Sending…";
                } else if (item.seenAtTS) {
                  const t = (item.seenAtTS as any)?.toDate?.() as Date | undefined;
                  const suffix = t ? formatRelativeTime(t) : "";
                  statusText = suffix ? `Seen ${suffix}` : "Seen";
                } else if (item.sentAtTS) {
                  statusText = "Sent";
                } else if (item.deliveredAtTS) {
                  statusText = "Delivered";
                }
              }

              return (
                <View>
                  {renderMessage({ item, index })}
                  {statusText ? (
                    <View style={styles.permanentSentFooterWrapper}>
                      <Text style={styles.permanentSentFooterText}>{statusText}</Text>
                    </View>
                  ) : null}
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContentContainer}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (autoScroll) {
                requestAnimationFrame(() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                );
              }
            }}
          />
        </View>

        {/* Global sent confirmation footer at bottom-right */}
        {sentFooter && (
          <View style={styles.sentFooterContainer} pointerEvents="none">
            <Text style={styles.sentFooterText}>{sentFooter}</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          {(arrowVisible || iconsHidden) && (
            <TouchableOpacity
              style={styles.collapseButton}
              onPress={slideInLeftIcons}
            >
              <Ionicons name="chevron-forward" size={24} color="#7B61FF" />
            </TouchableOpacity>
          )}

          <View style={styles.inputLeft}>
            <Animated.View
              style={{
                width: iconsReady ? leftIconsWidthAnim : undefined,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={[
                  leftIconsAnimatedStyle,
                  { flexDirection: "row", alignItems: "center" },
                ]}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (
                    iconsMeasuredWidthRef.current == null ||
                    iconsMeasuredWidthRef.current === 0
                  ) {
                    iconsMeasuredWidthRef.current = w;
                    leftIconsWidthAnim.setValue(w);
                    setIconsReady(true);
                  }
                }}
              >
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
                {/* Camera: capture photo */}
                <TouchableOpacity style={styles.inputIcon} onPress={captureAndSendPhoto}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                </TouchableOpacity>
                {/* Gallery: pick images or videos */}
                <TouchableOpacity style={styles.inputIcon} onPress={pickAndSendMedia}>
                  <Ionicons name="image" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="mic" size={24} color="#007AFF" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
              }}
              placeholder="Aa"
              placeholderTextColor="#8A8A8A"
              multiline
              onFocus={slideOutLeftIcons}
              onBlur={slideInLeftIcons}
            />
            <TouchableOpacity style={styles.emojiInside}>
              <Ionicons name="happy" size={22} color="#A8A8A8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRight}>
            <TouchableOpacity
              style={styles.inputIcon}
              onPress={() => {
                sendMessage();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full-screen media viewer */}
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
                style={[styles.viewerContent, { transform: [{ translateY: viewerPanY }] }]}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  flex1: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesList: { flex: 1, paddingHorizontal: 15 },
  messagesContentContainer: { paddingBottom: 20 },
  dateHeader: { alignItems: "center", marginVertical: 15 },
  dateHeaderText: { color: "#666", fontSize: 12, fontWeight: "500" },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 2,
    alignItems: "flex-end",
  },
  myMessageContainer: { justifyContent: "flex-end" },
  otherMessageContainer: { justifyContent: "flex-start" },
  avatarContainer: { marginRight: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 12, fontWeight: "bold" },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myMessageBubble: { backgroundColor: "#007AFF", borderBottomRightRadius: 4 },
  otherMessageBubble: { backgroundColor: "#333", borderBottomLeftRadius: 4 },
  messageText: { color: "white", fontSize: 16, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  leftIconsContainer: { overflow: "hidden" },
  inputLeft: { flexDirection: "row", alignItems: "center" },
  collapseButton: { marginRight: 8, padding: 4 },
  inputContainer: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
    minHeight: 42,
    maxHeight: 120,
    justifyContent: "center",
  },
  input: {
    color: "white",
    fontSize: 17,
    padding: 0,
    paddingRight: 40,
    textAlignVertical: "center",
  },
  emojiInside: { position: "absolute", right: 10, top: 10 },
  inputRight: { flexDirection: "row", alignItems: "center" },
  inputIcon: { marginHorizontal: 6, padding: 4 },
  viewerBackdrop: {
    ...(StyleSheet.absoluteFillObject as any),
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
  // Overlays and badges
  sendingOverlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  sendingText: { color: "#fff", marginTop: 6, fontSize: 12 },
  playIconWrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -14,
    marginTop: -14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    padding: 6,
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  videoBadgeText: { color: "#fff", fontSize: 11 },
  sentFooterContainer: {
    position: "absolute",
    right: 16,
    bottom: 72,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sentFooterText: { color: "#fff", fontSize: 12 },
  // Inline status under last outgoing message
  permanentSentFooterWrapper: {
    alignSelf: "flex-end",
    paddingTop: 4,
    paddingRight: 2,
    marginRight: 2,
  },
  permanentSentFooterText: {
    alignSelf: "flex-end",
    marginTop: 2,
    color: "#8E8E93",
    fontSize: 12,
    textAlign: "right",
  },
});

export default ConvoScreen;
