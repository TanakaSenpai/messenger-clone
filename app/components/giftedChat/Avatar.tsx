import React from 'react';
import { View, Image, StyleSheet } from'react-native';

import colors from 'app/configs/colors';

const RnAvatar = (props: any) => {
    const { currentMessage } = props;


    return (
      <View style={styles.avatarContainer}>
        <Image 
          source={{ 
            uri: currentMessage.user.avatar,
          }}
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>
    );
};

const styles = StyleSheet.create({
    avatarContainer: {
        marginHorizontal: 5,
        marginVertical: 3,
        backgroundColor: colors.blue,
        borderRadius: 16,
        overflow: 'hidden', 
      },
      avatar: {
        width: 30,
        height: 30,
      }
});

export default RnAvatar;