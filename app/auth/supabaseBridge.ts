import { supabase } from "app/configs/supabase";

/**
 * Ensures there's an active Supabase session for the given email/password.
 * Flow:
 * 1) Try signInWithPassword
 * 2) If it fails because the user doesn't exist or wrong creds, try signUp
 * 3) Then signInWithPassword again
 */
export async function ensureSupabaseSessionWithEmailPassword(email: string, password: string) {
  // Try sign-in first
  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  };

  try {
    return await signIn();
  } catch (err1: any) {
    // Attempt sign up, then sign in again
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined },
      });
      if (signUpError) throw signUpError;
      // Immediately sign in after sign up
      return await signIn();
    } catch (err2) {
      // Final attempt: propagate original sign-in error
      throw err2;
    }
  }
}
