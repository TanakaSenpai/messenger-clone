import { auth, db } from "app/configs/firebase";
import { supabase } from "app/configs/supabase";
import { ensureSupabaseSessionWithEmailPassword } from "app/auth/supabaseBridge";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
  address: string;
  gender: string;
  phoneNumber: string;
  email: string;
  password: string;
  updatedAt: Date;
  createdAt?: Date;
}

const Register = async (data: User) => {
  try {
    const userCreds = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    try {
      await updateProfile(userCreds.user, {
        displayName: `${data.firstName} ${data.lastName}`,
        photoURL: "https://picsum.photos/300/300",
      });
    } catch (profileError) {
      console.error("Profile update failed:", profileError);
    }

    await setDoc(doc(db, "userInfo", userCreds.user.uid), {
      uid: userCreds.user.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      avatar: data.avatar,
      address: data.address,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email,
      createdAt: serverTimestamp(),
    });

    // Ensure Supabase session exists for private Storage access
    try {
      await ensureSupabaseSessionWithEmailPassword(data.email, data.password);
      await supabase.auth.getSession();
    } catch (e) {
      console.error("Supabase sign-up/sign-in failed:", e);
    }

    return { success: true, user: userCreds.user };
  } catch (error) {
    console.error(error);
    if (error instanceof FirebaseError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unknown error occurred while registering the user.",
    };
  }
};

const Login = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Also login to Supabase (create if needed)
    try {
      await ensureSupabaseSessionWithEmailPassword(email, password);
      await supabase.auth.getSession();
    } catch (e) {
      console.error("Supabase sign-in failed:", e);
    }
    return { success: true, user: auth.currentUser };
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/user-not-found") {
        return { success: false, error: "User not found." };
      } else if (error.code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password." };
      }
    }
    return {
      success: false,
      error: "An unknown error occurred while logging in.",
    };
  }
};

const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const userRef = await getDoc(doc(db, "userInfo", userId));
    if (userRef.exists()) {
      return userRef.data() as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

const Logout = async () => {
  try {
    await signOut(auth);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase signOut failed:", e);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "An unknown error occurred while logging out.",
    };
  }
};

export { Register, Login, fetchUserData, Logout };
