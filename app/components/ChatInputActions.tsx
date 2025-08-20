import React from 'react';
import { TouchableOpacity, View, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileFromUri } from 'app/api/storage';
import { sendMediaMessageToConversation } from 'app/api/messages';
import type { User } from 'app/api/auth';

interface ChatInputActionsProps {
  conversationId: string;
  currentUser: User | null;
  style?: any;
}

export const ChatInputActions = ({ conversationId, currentUser, style }: ChatInputActionsProps) => {
  const pickAndSendMedia = async () => {
    if (!currentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'You need to grant permission to access the media library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const mediaType = asset.type === 'video' ? 'video' : 'image';

    try {
      const { downloadUrl } = await uploadFileFromUri({
        fileUri: asset.uri,
        kind: mediaType,
        conversationId,
        uploaderUid: currentUser.uid,
      });

      await sendMediaMessageToConversation(
        conversationId,
        { url: downloadUrl, type: mediaType },
        {
          uid: currentUser.uid,
          name: currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.email,
          avatar: currentUser.avatar,
        }
      );
    } catch (error) {
      console.error('Failed to send media:', error);
      Alert.alert('Upload Failed', 'Could not send the media. Please try again.');
    }
  };

  return (
    <View style={style.container}>
        <TouchableOpacity style={style.icon} onPress={pickAndSendMedia}>
            <Ionicons name="image" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={style.icon}>
            <Ionicons name="camera" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={style.icon}>
            <Ionicons name="mic" size={24} color="#007AFF" />
        </TouchableOpacity>
    </View>
  );
};
