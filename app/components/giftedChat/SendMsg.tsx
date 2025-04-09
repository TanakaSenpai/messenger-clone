import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Send } from "react-native-gifted-chat";
import IonIcons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

import colors from "app/configs/colors";

const SendMsg = (props: any) => {
  const { text = "" } = props;
  return (
    <Send {...props} containerStyle={styles.container} alwaysShowSend>
      {text.length > 0 ? (
        <IonIcons
          name="send"
          size={26}
          color={colors.blue}
          style={styles.icon}
        />
      ) : (
        <TouchableOpacity >
          <FontAwesome name="thumbs-up" size={26} color={colors.blue} style={styles.icon} />
        </TouchableOpacity>
      )}
    </Send>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  icon: {
    paddingHorizontal: 10,
  },
});

export default SendMsg;
