import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableHighlight,
  TextStyle,
} from "react-native";
import Feather from "react-native-vector-icons/Feather"

import colors from "app/configs/colors";
import Separator from "./Separator";

interface Props {
  items: {
    img?: any;
    logo?: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    titleStyles?: TextStyle;
    subTitleStyles?: TextStyle;
    showChevron?: boolean;
  }[];
}

const MenuItems = ({ items }: Props) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const showChevron = item.showChevron !== false;
        return (
        <View key={index}>
          <TouchableHighlight
          disabled={!item.onPress}
            underlayColor={colors.mediumGray}
            onPress={item.onPress}
            accessibilityLabel={item.title}
          >
            <View style={styles.itemWrapper}>
              <View style={styles.imgLogoWrapper}>
                {item.img && <Image source={item.img} style={styles.img} />}
                {item.logo && item.logo}
              </View>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, item.titleStyles]}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={[styles.subtitle, item.subTitleStyles]}>{item.subtitle}</Text>
                )}
              </View>
            { showChevron && <Feather name="chevron-right" size={24} color={colors.lightGray} />}
            </View>
          </TouchableHighlight>
          {index != items.length - 1 && <Separator />}
        </View>
      )})}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 15,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: colors.darkGray,
    overflow: "hidden",
  },
  img: {
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  imgLogoWrapper: {
    width: 50,
    alignItems: "center",
  },
  subtitle: {
    color: colors.lightGray,
    marginTop: 6,
    fontSize: 13,
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    height: 55,
  },
  title: {
    color: colors.white,
    fontSize: 16,
  },
  titleContainer: {
    marginLeft: 5,
    flex: 1
  },
});

export default MenuItems;
