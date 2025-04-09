import React from 'react';
import { SafeAreaView, StyleSheet } from'react-native';
import Constants from 'expo-constants';

const Screen = ({children}: {children: React.ReactNode}) => {
    return (
        <SafeAreaView style={styles.container}>
            {children}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Constants.OS === "ios" ? 20 : 0
    }
});

export default Screen;