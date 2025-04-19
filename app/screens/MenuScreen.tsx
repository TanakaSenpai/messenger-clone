import MenuItems from 'app/components/MenuItems';
import colors from 'app/configs/colors';
import React from 'react';
import { View, Text, StyleSheet } from'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const MenuScreen = () => {
    const iconSize = 28;
    return (
        <View style={styles.container}>
            <MenuItems items={[
                {
                    title: "Tanaka Senpai",
                    img: require("../assets/face.jpg"),
                    onPress: () => console.log("pressed")
                },
                {
                    title: "Settings",
                    logo: <MaterialIcons name="settings" size={iconSize} color={colors.white} />,
                    onPress: () => {}
                }
            ]} />
            
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        
    }
});

export default MenuScreen;