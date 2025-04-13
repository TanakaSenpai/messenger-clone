import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import Stories from "../screens/Stories";
import colors from "app/configs/colors";
import ChatNavigator from "./ChatNavigator";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import MenuScreen from "app/screens/MenuScreen";

const TabNavigator = () => {
  const Tab = createBottomTabNavigator();
  return (
    <Tab.Navigator screenOptions={{
      tabBarStyle: {
        backgroundColor: colors.black,
        borderTopWidth: 0
     }}}
    >
      <Tab.Screen
        options={({route}) => {
          const routeName = getFocusedRouteNameFromRoute(route)
          return { 
            tabBarStyle: {
              display: routeName === "Conversation" ? "none" : "flex",
              backgroundColor: colors.black,
              borderTopWidth: 0
            },
          headerShown: false,
          tabBarIcon: ({color}) => <Ionicons name="chatbubble" size={22} color={color} />
         }}}
        name="ChatsTab"
        component={ChatNavigator}
      />
      <Tab.Screen name="Stories" component={Stories} options={{ 
        tabBarIcon: ({ color }) => <MaterialIcons name="web-stories" size={22} color={color} />
       }} />
       <Tab.Screen name="Menu" component={MenuScreen} options={{ 
        tabBarIcon: ({color}) => <Ionicons name="menu" size={25} color={color} />
        }} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
