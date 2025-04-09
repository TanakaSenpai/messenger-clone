import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Composer, InputToolbar } from "react-native-gifted-chat";
import IonIcons from "react-native-vector-icons/Ionicons";

import colors from "app/configs/colors";

const RnInputToolbar = (props: any) => {
  const [showActions, setShowActions] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleActions = (show: boolean) => {
    setShowActions(show);
    Animated.timing(slideAnim, {
      toValue: show ? 0 : -100,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  return (
    <InputToolbar
      {...props}
      containerStyle={styles.container}
      renderActions={() =>
        showActions ? (
          <View style={styles.iconsContainer}>
            <TouchableOpacity>
              <IonIcons name="add-circle" size={28} color={colors.blue} />
            </TouchableOpacity>
            <TouchableOpacity>
              <IonIcons name="camera" size={28} color={colors.blue} />
            </TouchableOpacity>
            <TouchableOpacity>
              <IonIcons name="image" size={28} color={colors.blue} />
            </TouchableOpacity>
            <TouchableOpacity>
              <IonIcons name="mic" size={28} color={colors.blue} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => toggleActions(true)}
            style={styles.iconsContainer}
          >
            <IonIcons
              name="chevron-forward-outline"
              color={colors.blue}
              size={28}
            />
          </TouchableOpacity>
        )
      }
      renderComposer={(props) => (
        <Composer
          {...props}
          textInputStyle={styles.textInput}
          placeholder="Aa"
          textInputProps={{
            onFocus: () => toggleActions(false),
            onBlur: () => toggleActions(true),
          }}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.black,
    borderTopWidth: 0,
    marginBottom: 30,
    paddingVertical: 5,
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: "100%",
    marginLeft: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 7,
    color: colors.white,
    fontSize: 17,
    textAlignVertical: "center"
  },
});

export default RnInputToolbar;
