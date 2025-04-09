import { Chat } from "app/screens/Chats"

export type RootStackParamList = {
    Chats: undefined;
    Conversation: {chat: Chat};
}

export type AuthStackParamList = {
    Login: undefined;
    Registration: undefined;
  };