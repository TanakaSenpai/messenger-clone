import MenuItems from "app/components/MenuItems";
import colors from "app/configs/colors";
import React from "react";
import { View, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Entypo from "react-native-vector-icons/Entypo";
import IonIcons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const MenuScreen = () => {
  const iconSize = 25;
  const iconColor = colors.white;

  return (
    <View style={styles.container}>
      <MenuItems
        items={[
          {
            title: "Tanaka Senpai",
            subtitle: "@sakifshahedur",
            img: require("../assets/face.jpg"),
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default MenuScreen;
