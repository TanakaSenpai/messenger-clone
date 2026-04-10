import { Chat } from "app/screens/Chats"

export type RootStackParamList = {
    Chats: undefined;
    Conversation: {chat: Chat};
    ConvoInfo: {chat: Chat};
    MediaGallery: {conversationId: string, chatName: string};
    SearchConvo: {conversationId: string, chatName: string};
    Feed: undefined;
    Explore: undefined;
    CreatePost: undefined;
    Profile: { userId?: string };
    Menu: undefined;
    Settings: undefined;
}

export type AuthStackParamList = {
    Login: undefined;
    Registration: undefined;
  };