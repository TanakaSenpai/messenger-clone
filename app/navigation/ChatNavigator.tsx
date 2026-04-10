import { createStackNavigator } from "@react-navigation/stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";

import Chats from "app/screens/Chats";
import ConvoScreen from "app/screens/ConvoScreen";
import ConvoInfoScreen from "app/screens/ConvoInfoScreen";
import MediaGalleryScreen from "app/screens/MediaGalleryScreen";
import SearchConvoScreen from "app/screens/SearchConvoScreen";
import colors from "app/configs/colors";
import { RootStackParamList } from "./types";
import { Image, TouchableOpacity, View, Text } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";

const Stack = createStackNavigator<RootStackParamList>();
const ChatNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.black },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen
        name="Chats"
        component={Chats}
        options={{
          headerLeft: () => {
            const nav = useNavigation<any>();
            return (
              <TouchableOpacity onPress={() => nav.navigate("Menu")}>
                <MaterialCommunityIcons
                  name="menu"
                  color={colors.white}
                  size={23}
                  style={{
                    padding: 7,
                    backgroundColor: colors.darkGray,
                    borderRadius: 20,
                    marginHorizontal: 15,
                  }}
                />
              </TouchableOpacity>
            );
          },
          headerRight: () => (
            <MaterialCommunityIcons
              name="pencil"
              color={colors.white}
              size={20}
              style={{
                backgroundColor: colors.darkGray,
                padding: 7,
                borderRadius: 20,
                marginRight: 15,
              }}
            />
          ),
        }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConvoScreen}
        options={({ route, navigation }) => ({
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "left",
          headerTintColor: colors.blue,
          headerTitle: () => {
            return (
              <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 0 }}>
                <Image
                  source={{ uri: route.params.chat.avatar }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 25,
                    marginRight: 10,
                  }}
                />
                <View>
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {route.params.chat.name}
                  </Text>
                  <Text style={{ color: colors.darkGray, fontSize: 13 }}>
                    Active now
                  </Text>
                </View>
              </View>
            );
          },
          headerRight: () => (
            <View style={{ flexDirection: "row", marginRight: 5 }}>
              <IonIcon name="call" />
              <IonIcon name="videocam" />
              <IonIcon
                name="information-circle"
                onPress={() => {
                  navigation.navigate("ConvoInfo", { chat: route.params.chat });
                }}
              />
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="ConvoInfo"
        component={ConvoInfoScreen}
        options={{
          title: "",
          headerBackTitle: "",
          headerTintColor: colors.blue,
        }}
      />
      <Stack.Screen
        name="MediaGallery"
        component={MediaGalleryScreen}
        options={{
          title: "Media, Files & Links",
          headerBackTitle: "",
          headerTintColor: colors.blue,
        }}
      />
      <Stack.Screen
        name="SearchConvo"
        component={SearchConvoScreen}
        options={{
          title: "Search conversation",
          headerBackTitle: "",
          headerTintColor: colors.blue,
        }}
      />
    </Stack.Navigator>
  );
};

const IonIcon = ({ name, onPress }: { name: string; onPress?: () => void }) => (
  <TouchableOpacity onPress={onPress}>
    <Ionicons
      name={name}
      size={23}
      color={colors.blue}
      style={{ marginHorizontal: 10 }}
    />
  </TouchableOpacity>
);

export default ChatNavigator;
