import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from 'app/screens/LoginScreen';
import RegistrationScreen from 'app/screens/RegistrationScreen';
import { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Registration" component={RegistrationScreen} options={{ headerShown: false }} />
        </Stack.Navigator>        
    );
};

export default AuthNavigator;