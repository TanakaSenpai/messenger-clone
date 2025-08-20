import { createStackNavigator } from "@react-navigation/stack";
import colors from "app/configs/colors";
import MenuScreen from "app/screens/MenuScreen";
import SettingsScreen from "app/screens/SettingsScreen";

export type MenuStackParamList = {
  MenuHome: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<MenuStackParamList>();

const MenuNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.black },
        headerTintColor: colors.white,
        headerTitleStyle: { fontSize: 24 },
        headerTitleAlign: "left",
      }}
    >
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ title: "Menu" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
};

export default MenuNavigator;
