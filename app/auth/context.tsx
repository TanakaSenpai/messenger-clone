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

export {AuthContext};
