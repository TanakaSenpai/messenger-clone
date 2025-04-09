import React from 'react';
import { View, Text, StyleSheet } from'react-native';
import { Composer } from 'react-native-gifted-chat';

const RnComposer = (props: any) => {
    return (
        <Composer {...props} containerStyles={styles.container} />
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "red"
    }
});

export default RnComposer;