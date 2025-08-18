import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import {
  buildConversationId,
  ensureConversationDoc,
  sendMessageToConversation,
  subscribeToMessages,
  ChatMessageRecord,
} from "app/api/messages";
import { useContext, useMemo } from "react";
import { AuthContext } from "app/auth/context";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
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

  const headerHeight = useHeaderHeight();
  const { chat } = route.params;
  const { user: currentUser } = useContext(AuthContext);

  const conversationId = useMemo(() => {
    const otherId = String(chat.id);
    const me = currentUser?.uid ?? "anonymous";
    return buildConversationId(me, otherId);
  }, [chat.id, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        await ensureConversationDoc(conversationId, [
          currentUser.uid,
          String(chat.id),
        ]);
      } catch {}
      unsubscribe = subscribeToMessages(conversationId, (records) => {
        const mapped: Message[] = records.map((r) => ({
          id: r.id || Math.random().toString(),
          text: r.text,
          timestamp: (r.createdAt as any)?.toDate
            ? (r.createdAt as any).toDate()
            : new Date(),
          user: {
            id: r.senderId,
            name:
              r.senderName ||
              (r.senderId === currentUser.uid ? "You" : chat.name),
            avatar:
              r.senderAvatar ||
              (r.senderId === currentUser.uid ? undefined : chat.avatar),
          },
        }));
        setMessages(mapped);
      });
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, currentUser?.uid]);

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

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser?.uid) return;
    const text = inputText.trim();
    setInputText("");
    try {
      await sendMessageToConversation(conversationId, text, {
        uid: currentUser.uid,
        name: currentUser.firstName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.email,
        avatar: currentUser.avatar,
      });
    } catch (e) {
      // If sending fails, restore input so user can retry
      setInputText(text);
    }
  };

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
            style={[
              styles.messageBubble,
              isCurrentUser
                ? styles.myMessageBubble
                : styles.otherMessageBubble,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
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
            renderItem={renderMessage}
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

          {iconsReady && (
            <Animated.View
              style={[styles.leftIconsContainer, { width: leftIconsWidthAnim }]}
            >
              <Animated.View
                style={[styles.inputLeft, leftIconsAnimatedStyle]}
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
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="image" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="mic" size={24} color="#007AFF" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}

          {!iconsReady && (
            <View style={styles.leftIconsContainer}>
              <View
                style={styles.inputLeft}
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
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="image" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="mic" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
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
            <TouchableOpacity style={styles.inputIcon} onPress={sendMessage}>
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
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
});

export default ConvoScreen;
