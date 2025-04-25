import React, { useContext } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import IonIcons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

import colors from "app/configs/colors";
import MenuItems from "app/components/MenuItems";
import { Logout } from "app/api/auth";
import { AuthContext } from "app/auth/context";
import { useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "app/navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Login"
>;
const MenuScreen = () => {
  const navigator = useNavigation<LoginScreenNavigationProp>();
  const iconSize = 25;
  const iconColor = colors.white;
  const { user } = useContext(AuthContext);
  if (!user) {
    navigator.navigate("Login");
    return null;
  }

  return (
    <>
      <MenuItems
        items={[
          {
            title: `${user.firstName} ${user.lastName}`,
            subtitle: `@${user.username}`,
            img: require("../assets/face.jpg"),
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
            onPress: () => {},
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
