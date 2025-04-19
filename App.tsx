import { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "app/configs/firebase";
import { fetchUserData, User } from "app/api/auth";
import SplashScreen from "app/screens/SplashScreen";
import TabNavigator from "./app/navigation/TabNavigator";
import AuthNavigator from "app/navigation/AuthNavigator";
import colors from "app/configs/colors";
import { AuthContext } from "app/auth/context";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <AuthContext.Provider value={{ user, loading }}>
        <StatusBar style="light" />
      <NavigationContainer theme={customTheme}>
        {user ? <TabNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
