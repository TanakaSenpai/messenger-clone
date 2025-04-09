import { auth, db } from "app/configs/firebase";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
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
      console.log("Profile update failed (non-critical):", profileError);
    }

    await setDoc(doc(db, "userInfo", userCreds.user.uid), {
      uid: userCreds.user.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email,
      createdAt: serverTimestamp(),
    });

    return { success: true, user: userCreds.user };
  } catch (error) {
    console.log(error);
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
    return { success: true, user: auth.currentUser };
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/user-not-found") {
        return { success: false, error: "User not found." };
      } else if (error.code === "auth/invalid-credential") {
        return { success: false, error: "Incorrect password." };
      }
    } else {
      return { success: false, error: "An unknown error occurred while logging in." };
    }
  }
};

export { Register, Login };
