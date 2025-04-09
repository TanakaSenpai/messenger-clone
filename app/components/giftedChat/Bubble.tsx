import React from 'react';
import { StyleSheet } from'react-native';
import { Bubble } from 'react-native-gifted-chat';

import colors from 'app/configs/colors';

const RnBubble = (props: any) => {
    return (
        <Bubble {...props} wrapperStyle={{ 
            right: {
              backgroundColor: colors.blue,
              ...styles.wrapper
            },
            left: {
              backgroundColor: colors.darkGray,
              ...styles.wrapper
            },
          }}
          textStyle={{ 
            left: {
              color: colors.white,
              ...styles.text
            },
            right: {
              ...styles.text
            }
          }} />
    );
};

const styles = StyleSheet.create({
    text: {
        paddingHorizontal: 2,
        paddingVertical: 3
      },
      wrapper: {
        borderRadius: 18,
      },
});

export default RnBubble;