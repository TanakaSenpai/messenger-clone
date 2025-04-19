import React from 'react';
import { View, StyleSheet } from'react-native';

import colors from 'app/configs/colors';

const Separator = () => {
    return (
        <View style={styles.separator} />
    );
};

const styles = StyleSheet.create({
    separator: {
        height: 1,
        width: "100%",
        backgroundColor: colors.mediumGray,
        marginLeft: 60,
      }
});

export default Separator;