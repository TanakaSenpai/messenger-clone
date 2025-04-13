import { createContext, useEffect, useState } from "react";

import { fetchUserData, User } from "app/api/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "app/configs/firebase";
import SplashScreen from "app/screens/SplashScreen";

// Define the context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const minSplashTime = 1000; // 1 second
    const startTime = Date.now();
  
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
  
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(minSplashTime - elapsed, 0);
  
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    });
  
    return () => unsubscribe();
  }, []);

  if (loading) return <SplashScreen />

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export {AuthContext, AuthContextProvider};
