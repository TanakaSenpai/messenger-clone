import React from 'react';
import { View, Text, StyleSheet, Image, TouchableHighlight } from 'react-native';

import { Chat } from 'app/screens/Chats';
import colors from 'app/configs/colors';

const MsgPreview = ({ chat, onPress }: { chat: Chat; onPress: (item: Chat) => void }) => {
  return (
    <TouchableHighlight 
      style={styles.container} 
      underlayColor="#3E4042" 
      onPress={() => onPress(chat)}
    >
      <View style={styles.innerContainer}>
        <Image source={{ uri: chat.avatar }} style={styles.avatar} resizeMode="cover" />
        <View style={styles.textContainer}>
          <Text style={[styles.name, !chat.isRead && { fontWeight: 'bold' }]}>{chat.name}</Text>
          <View style={styles.messageContainer}>
            <Text style={[styles.message, chat.isRead ? styles.isRead : styles.isNotRead]} numberOfLines={1}>
              {chat.message}
            </Text>
            <Text style={[styles.time, chat.isRead ? styles.isRead : styles.isNotRead]}>• {chat.time}</Text>
          </View>
        </View>
      </View>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 5
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    maxWidth: "85%"
  },
  isRead: {
    color: 'gray',
    flexShrink: 1,
  },
  isNotRead: {
    color: colors.white,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  time: {
    marginLeft: 8
  },
});

export default MsgPreview;
