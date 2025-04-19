import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableHighlight,
} from "react-native";

import colors from "app/configs/colors";
import Separator from "./Separator";

interface Props {
  items: {
    img?: any;
    logo?: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }[];
}

const MenuItems = ({ items }: Props) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <> 
      <TouchableHighlight key={index} underlayColor={colors.mediumGray} onPress={item.onPress}>
            <View style={styles.itemWrapper}>
              <View style={styles.imgLogoWrapper}>
                {item.img && <Image source={item.img} style={styles.img} />}
                {item.logo && item.logo}
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{item.title}</Text>
                {item.subtitle && <Text>{item.subtitle}</Text>}
              </View>
            </View>
          </TouchableHighlight>
          {index != items.length - 1 && <Separator />}
        </>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 10,
    marginBottom: 10,
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
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    height: 60
  },
  title: {
    color: colors.white,
    fontSize: 17,
  },
  titleContainer: {
    marginLeft: 5,
  },
});

export default MenuItems;
