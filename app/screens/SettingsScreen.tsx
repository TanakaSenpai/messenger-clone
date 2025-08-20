import React, { useContext, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need media library permission to pick an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
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
    } catch (e) {
      Alert.alert("Update failed", "Could not update your profile. Please try again.");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.black }} contentContainerStyle={{ padding: 16 }}>
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

      <Button title={isSubmitting ? "Saving..." : "Save"} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
      {isSubmitting ? (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : null}
    </ScrollView>
  );
};

export default SettingsScreen;
