import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import TabNavigator from './app/navigation/TabNavigator';
import colors from 'app/configs/colors';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from 'app/navigation/AuthNavigator';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.black,
    text: "white"
  },
};

export default function App() {
  return (
    <>
    <StatusBar style='light' />
    <NavigationContainer theme={customTheme}>
      <AuthNavigator />
      {/* <TabNavigator /> */}
    </NavigationContainer>
    </>
  );
}
