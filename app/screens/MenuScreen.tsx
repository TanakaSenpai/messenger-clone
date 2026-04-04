import React, { useContext } from "react";
import {
  View,
  Text,
  Image,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import IonIcons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

import colors from "app/configs/colors";
import MenuItems from "app/components/MenuItems";
import { Logout } from "app/api/auth";
import { AuthContext } from "app/auth/context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import type { MenuStackParamList } from "app/navigation/MenuNavigator";

const MenuScreen = () => {
  const navigator = useNavigation<StackNavigationProp<MenuStackParamList>>();
  const iconSize = 25;
  const iconColor = colors.white;
  const { user } = useContext(AuthContext);
  if (!user) {
    return null;
  }

  const userAvatar = user.avatar || "https://picsum.photos/200";

  return (
    <>
      <MenuItems
        items={[
          {
            title: `${user.firstName} ${user.lastName}`,
            subtitle: `@${user.username}`,
            img: userAvatar.startsWith("http") ? { uri: userAvatar } : userAvatar,
            showChevron: false
          },
          {
            title: "Settings",
            logo: (
              <MaterialIcons
                name="settings"
                size={iconSize}
                color={iconColor}
              />
            ),
            onPress: () => navigator.navigate("Settings"),
          },
        ]}
      />

      <MenuItems
        items={[
          {
            title: "Marketplace",
            logo: <Entypo name="shop" size={iconSize} color={iconColor} />,
            onPress: () => console.log("icon"),
          },
          {
            title: "Marketplace",
            logo: (
              <IonIcons
                name="chatbubble-ellipses-sharp"
                size={iconSize}
                color={iconColor}
              />
            ),
            onPress: () => console.log("icon"),
          },
          {
            title: "Archive",
            logo: (
              <FontAwesome name="archive" size={iconSize} color={iconColor} />
            ),
            onPress: () => console.log("icon"),
          },
        ]}
      />

      <MenuItems
        items={[
          {
            title: "Friend requests",
            logo: <IonIcons name="people" size={iconSize} color={iconColor} />,
            onPress: () => console.log("icon"),
          },
        ]}
      />

      <MenuItems
        items={[
          {
            title: "Logout",
            logo: (
              <MaterialIcons name="logout" size={iconSize} color={colors.red} />
            ),
            onPress: async () => await Logout(),
            titleStyles: { color: colors.red },
            showChevron: false
          },
        ]}
      />
    </>
  );
};

export default MenuScreen;
