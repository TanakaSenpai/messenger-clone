import { createStackNavigator } from "@react-navigation/stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";

import Chats from "app/screens/Chats";
import ConvoScreen from "app/screens/ConvoScreen";
import colors from "app/configs/colors";
import { RootStackParamList } from "./types";
import { Image, TouchableOpacity, View, Text } from "react-native";

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
          headerLeft: () => (
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
          ),
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
        options={({ route }) => ({
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
              <IonIcon name="information-circle" />
            </View>
          ),
        })}
      />
    </Stack.Navigator>
  );
};

const IonIcon = ({ name }: { name: string }) => (
  <TouchableOpacity>
    <Ionicons
      name={name}
      size={23}
      color={colors.blue}
      style={{ marginHorizontal: 10 }}
    />
  </TouchableOpacity>
);

export default ChatNavigator;
