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
      avatar: data.avatar || "",
      address: data.address || "",
      gender: data.gender || "",
      phoneNumber: data.phoneNumber || "",
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

const DeleteAccount = async (password: string) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("No user logged in or missing email");

    // 1. Re-authenticate
    const { EmailAuthProvider, reauthenticateWithCredential, deleteUser } = await import("firebase/auth");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    const uid = user.uid;

    // 2. Clean up Firestore
    const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
    
    // Find all conversations
    const convosRef = collection(db, "conversations");
    const q = query(convosRef, where("participants", "array-contains", uid));
    const convosSnap = await getDocs(q);

    for (const convoDoc of convosSnap.docs) {
      const convoId = convoDoc.id;
      const msgsRef = collection(db, "conversations", convoId, "messages");
      const msgsSnap = await getDocs(msgsRef);

      for (const msgDoc of msgsSnap.docs) {
        const msgData = msgDoc.data();
        
        // 3. Clean up Supabase Storage if it's media
        if (msgData.mediaUrl) {
          try {
            const { BUCKET } = await import("app/api/storageSupabase");
            const baseUrl = msgData.mediaUrl.split("?")[0];
            const parts = baseUrl.split(`/public/${BUCKET}/`);
            if (parts.length > 1) {
              const path = parts[1];
              await supabase.storage.from(BUCKET).remove([path]);
            }
          } catch (e) {
             console.log("Failed to delete media from Supabase", e);
          }
        }
        await deleteDoc(msgDoc.ref);
      }
      await deleteDoc(convoDoc.ref);
    }

    // Delete user profile in Firestore
    await deleteDoc(doc(db, "userInfo", uid));

    // Delete avatar from Supabase Storage if it exists
    try {
      const { data: avatarFiles } = await supabase.storage.from("avatars").list(uid);
      if (avatarFiles && avatarFiles.length > 0) {
         const paths = avatarFiles.map(f => `${uid}/${f.name}`);
         await supabase.storage.from("avatars").remove(paths);
      }
    } catch (e) {
      console.log("Failed to delete avatar from Supabase", e);
    }

    // 4. Delete Auth User (Supabase & Firebase)
    try {
      // Best effort log out from Supabase (can't delete auth record from client)
      await supabase.auth.signOut();
    } catch {}

    await deleteUser(user);

    return { success: true };
  } catch (error: any) {
    console.error("DeleteAccount error:", error);
    if (error instanceof FirebaseError) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password." };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred while deleting the account." };
  }
};

export { Register, Login, fetchUserData, Logout, DeleteAccount };
