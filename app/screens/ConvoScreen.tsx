import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import { GiftedChat, IMessage } from "react-native-gifted-chat";

import RnInputToolbar from "app/components/giftedChat/InputToolbar";
import SendMsg from "app/components/giftedChat/SendMsg";
import RnComposer from "app/components/giftedChat/Composer";
import RnBubble from "app/components/giftedChat/Bubble";
import RnAvatar from "app/components/giftedChat/Avatar";
import colors from "app/configs/colors";

const ConvoScreen = ({route}: {route: RouteProp<RootStackParamList, "Conversation">}) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const {chat} = route.params;

  useEffect(() => {
    setMessages([
      {
        _id: chat.id,
        text: chat.message,
        createdAt: new Date(),
        user: {
          _id: chat.id,
          name: chat.name,
          avatar: chat.avatar,
        },
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages: IMessage[]) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );
  }, []);

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        user={{
          _id: 1,
          name: chat.name,
          avatar: chat.avatar,
        }}
        renderBubble={(props) => <RnBubble {...props} />}
        renderAvatar={(props) => <RnAvatar {...props} />}
        renderInputToolbar={ (props) => <RnInputToolbar {...props} />}
        renderComposer={(props) => <RnComposer {...props} />}
        renderSend={(props) => <SendMsg {...props} />}
        renderTime={() => null}
        showAvatarForEveryMessage={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default ConvoScreen;