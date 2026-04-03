import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import colors from "app/configs/colors";
import { AuthContext } from "app/auth/context";
import type { User } from "app/api/auth";
import { updateUserProfile } from "app/api/profile";

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: colors.darkGray, marginBottom: 6 }}>{children}</Text>
);

const Field = ({ children }: { children: React.ReactNode }) => (
  <View style={{ marginBottom: 16 }}>{children}</View>
);

const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor={colors.darkGray}
    style={{
      borderWidth: 1,
      borderColor: colors.darkGray,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.white,
    }}
    {...props}
  />
);

const Button = ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? colors.darkGray : colors.blue,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    }}
  >
    <Text style={{ color: colors.white, fontWeight: "600" }}>{title}</Text>
  </TouchableOpacity>
);

const SettingsScreen = () => {
  const { user, setUser } = useContext(AuthContext);
  const defaultValues = useMemo(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    address: user?.address || "",
    gender: user?.gender || "",
    phoneNumber: user?.phoneNumber || "",
    avatar: user?.avatar || "",
  }), [user]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<{[K in keyof typeof defaultValues]: string}>({ defaultValues });
  const [localAvatarUri, setLocalAvatarUri] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need media library permission to pick an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setLocalAvatarUri(asset.uri);
      }
    } catch (e) {
      Alert.alert("Image Picker Error", "Unable to pick image.");
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const payload: Partial<User> & { avatarFileUri?: string } = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        address: data.address,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
      };
      if (localAvatarUri) payload.avatarFileUri = localAvatarUri;

      const updated = await updateUserProfile(payload);
      if (user) {
        const nextUser: User = {
          ...user,
          ...updated as any,
          avatar: (updated as any).avatar ?? user.avatar,
          updatedAt: new Date(),
        };
        setUser(nextUser);
      }
      Alert.alert("Success", "Profile updated.");
    } catch (e: any) {
      console.error("[SettingsScreen] Profile update failed:", e?.message ?? e);
      Alert.alert("Update failed", e?.message || "Could not update your profile. Please try again.");
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert("Error", "Password is required.");
      return;
    }
    setDeleteModalVisible(false);
    setIsDeleting(true);
    try {
      const { DeleteAccount } = await import("app/api/auth");
      const res = await DeleteAccount(deletePassword);
      if (res.success) {
        setUser(null);
      } else {
        Alert.alert("Deletion Failed", res.error ?? "Account could not be deleted.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
      setDeletePassword("");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.black }} contentContainerStyle={{ padding: 16 }}>
      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <View style={{ backgroundColor: "#1c1c1e", borderRadius: 16, padding: 24, width: "85%", gap: 16 }}>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
              Delete Account
            </Text>
            <Text style={{ color: colors.darkGray, textAlign: "center", fontSize: 14, lineHeight: 20 }}>
              This will permanently delete your account, all your conversations, messages, and media. This cannot be undone.
            </Text>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor={colors.darkGray}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              style={{
                borderWidth: 1,
                borderColor: "#444",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.white,
                backgroundColor: "#2c2c2e",
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(""); }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#444", alignItems: "center" }}
              >
                <Text style={{ color: colors.white }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteAccount}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#ff3b30", alignItems: "center" }}
              >
                <Text style={{ color: colors.white, fontWeight: "700" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: localAvatarUri || user?.avatar || "https://picsum.photos/200" }}
            style={{ width: 100, height: 100, borderRadius: 60 }}
          />
        </TouchableOpacity>
        <Text style={{ color: colors.blue, marginTop: 8 }}>Change photo</Text>
      </View>

      <Field>
        <Label>First name</Label>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="John" />
          )}
        />
      </Field>

      <Field>
        <Label>Last name</Label>
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="Doe" />
          )}
        />
      </Field>

      <Field>
        <Label>Username</Label>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="johndoe" />
          )}
        />
      </Field>

      <Field>
        <Label>Address</Label>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="123 Main St" />
          )}
        />
      </Field>

      <Field>
        <Label>Gender</Label>
        <Controller
          control={control}
          name="gender"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="Male/Female/Other" />
          )}
        />
      </Field>

      <Field>
        <Label>Phone</Label>
        <Controller
          control={control}
          name="phoneNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input onBlur={onBlur} onChangeText={onChange} value={value} placeholder="+1 555 555 5555" keyboardType="phone-pad" />
          )}
        />
      </Field>

      <Button title={isSubmitting ? "Saving..." : "Save"} onPress={handleSubmit(onSubmit)} disabled={isSubmitting || isDeleting} />
      {isSubmitting ? (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : null}

      {/* Delete Account Section */}
      <View style={{ marginTop: 40, marginBottom: 40 }}>
        <TouchableOpacity
          onPress={() => setDeleteModalVisible(true)}
          disabled={isDeleting || isSubmitting}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          {isDeleting ? (
            <ActivityIndicator color="red" />
          ) : (
            <Text style={{ color: "red", fontWeight: "600" }}>Delete Account</Text>
          )}
        </TouchableOpacity>
        <Text style={{ color: colors.darkGray, textAlign: "center", fontSize: 12, marginTop: 8 }}>
          This will permanently wipe all your data from our servers.
        </Text>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
