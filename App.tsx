import { useEffect, useState, useRef } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "app/configs/firebase";
import { fetchUserData, User } from "app/api/auth";
import SplashScreen from "app/screens/SplashScreen";
import TabNavigator from "./app/navigation/TabNavigator";
import AuthNavigator from "app/navigation/AuthNavigator";
import colors from "app/configs/colors";
import { AuthContext } from "app/auth/context";
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { markMessageSent } from "app/api/messages";

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.black,
    text: "white",
  },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const attemptedSentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // start loading when auth state changes
      if (firebaseUser) {
        try {
          const userData = await fetchUserData(firebaseUser.uid);
          setUser(userData);
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false); // stop loading
    });
  
    return unsubscribe;
  }, []);

  // Background: when online, advance any incoming delivered messages to sent
  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribers: Array<() => void> = [];
    (async () => {
      try {
        // Get conversations the user is a participant of
        const qConvos = query(
          collection(db, "conversations"),
          where("participants", "array-contains", user.uid)
        );
        const convoSnap = await getDocs(qConvos);
        const convoIds = convoSnap.docs.map((d) => d.id);

        // Subscribe to delivered messages in each conversation
        convoIds.forEach((conversationId) => {
          const qMsgs = query(
            collection(db, "conversations", conversationId, "messages"),
            where("status", "==", "delivered"),
            where("receiverId", "==", user.uid)
          );
          const unsub = onSnapshot(qMsgs, (snap) => {
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data() as any;
              const messageId = data.id as string;
              if (messageId && !attemptedSentIdsRef.current.has(messageId)) {
                attemptedSentIdsRef.current.add(messageId);
                markMessageSent(conversationId, messageId).catch((e) => {
                  console.error("Global markMessageSent failed", { conversationId, messageId, error: e });
                });
              }
            });
          });
          unsubscribers.push(unsub);
        });
      } catch (e) {
        console.error("Failed to initialize delivered->sent listeners", e);
      }
    })();
    return () => {
      unsubscribers.forEach((u) => u());
      unsubscribers = [];
    };
  }, [user?.uid]);
  
  if (loading) return <SplashScreen />;
  
  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
        <StatusBar style="light" />
      <NavigationContainer theme={customTheme}>
        {user ? <TabNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
