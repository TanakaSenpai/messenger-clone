import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from 'app/configs/firebase';
import { fetchUserData, User } from 'app/api/auth';
import SplashScreen from 'app/screens/SplashScreen';
import TabNavigator from './app/navigation/TabNavigator';
import AuthNavigator from 'app/navigation/AuthNavigator';
import colors from 'app/configs/colors';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.black,
    text: "white"
  },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth state check runs FIRST before rendering anything
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

  // 2. Show splash screen while loading
  if (loading) return <SplashScreen />;

  // 3. Only render navigation AFTER auth state resolves
  return (
    <NavigationContainer theme={customTheme}>
      <StatusBar style='light' />
      {user ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}