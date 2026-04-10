import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from "react-native-vector-icons/Ionicons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

import FeedScreen from "../screens/FeedScreen";
import ExploreScreen from "../screens/ExploreScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatNavigator from "./ChatNavigator";
import MenuNavigator from "app/navigation/MenuNavigator";
import colors from "app/configs/colors";

const TabNavigator = () => {
  const Tab = createBottomTabNavigator();
  
  return (
    <Tab.Navigator 
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.black,
          borderTopWidth: 0.5,
          borderTopColor: colors.darkGray,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.mediumGray,
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={28} color={color} />,
        }}
      />
      <Tab.Screen
        name="ChatsTab"
        component={ChatNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          return {
            tabBarStyle: {
              display: (routeName === "Conversation" || routeName === "ConvoInfo" || routeName === "MediaGallery" || routeName === "SearchConvo") ? "none" : "flex",
              backgroundColor: colors.black,
              borderTopWidth: 0.5,
              borderTopColor: colors.darkGray,
              height: 60,
              paddingBottom: 8,
            },
            tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />,
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
