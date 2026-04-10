import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "app/navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import colors from "app/configs/colors";
import { buildConversationId } from "app/api/messages";
import { useContext } from "react";
import { AuthContext } from "app/auth/context";

type ConvoInfoScreenRouteProp = RouteProp<RootStackParamList, "ConvoInfo">;
type ConvoInfoScreenNavigationProp = StackNavigationProp<RootStackParamList, "ConvoInfo">;

interface Props {
  route: ConvoInfoScreenRouteProp;
  navigation: ConvoInfoScreenNavigationProp;
}

const ConvoInfoScreen = ({ route, navigation }: Props) => {
  const { chat } = route.params;
  const { user } = useContext(AuthContext);

  const conversationId = buildConversationId(user?.uid ?? "", String(chat.id));

  const options = [
    {
      id: "media",
      title: "View Media, Files & Links",
      icon: "images",
      onPress: () => navigation.navigate("MediaGallery", { 
        conversationId, 
        chatName: chat.name 
      }),
    },
    { 
      id: "search", 
      title: "Search in Conversation", 
      icon: "search",
      onPress: () => navigation.navigate("SearchConvo", { 
        conversationId, 
        chatName: chat.name 
      }),
    },
    { id: "profile", title: "View Profile", icon: "person", onPress: () => console.log("View Profile placeholder") },
    { id: "notifications", title: "Notifications & Sounds", icon: "notifications" },
    { id: "privacy", title: "Privacy & Support", icon: "lock-closed" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={{ uri: chat.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.presenceText}>Active now</Text>
          <View style={styles.headerIcons}>
            <HeaderIcon name="call" label="Audio" />
            <HeaderIcon name="videocam" label="Video" />
            <HeaderIcon name="person" label="Profile" />
            <HeaderIcon name="notifications" label="Mute" />
          </View>
        </View>

        <View style={styles.section}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={option.onPress}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name={option.icon} size={20} color={colors.white} />
              </View>
              <Text style={styles.optionTitle}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const HeaderIcon = ({ name, label }: { name: string; label: string }) => (
  <TouchableOpacity style={styles.headerIconWrapper}>
    <View style={styles.headerIconCircle}>
      <Ionicons name={name} size={22} color={colors.white} />
    </View>
    <Text style={styles.headerIconLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 15,
  },
  name: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 5,
  },
  presenceText: {
    color: "#8E8E93",
    fontSize: 14,
    marginBottom: 25,
  },
  headerIcons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 20,
  },
  headerIconWrapper: {
    alignItems: "center",
    width: 70,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  headerIconLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "400",
  },
  section: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  optionIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "400",
  },
});

export default ConvoInfoScreen;
