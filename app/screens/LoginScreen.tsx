import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Image, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import InputField from "../components/form/InputField";
import colors from "app/configs/colors";
import { useNavigation } from "@react-navigation/native";
import { AuthStackParamList } from "app/navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";
import { ScrollView } from "react-native";
import { Login } from "app/api/auth";

interface LoginData {
  email: string;
  password: string
}

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Login">;
const MessengerLoginScreen = () => {
  const methods = useForm<LoginData>();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const onSubmit = async (data: LoginData) => {
    const result = await Login(data.email, data.password);
    if (result!.success) {
      alert("done")
    } 
    if (result!.error) {
      Alert.alert("Error", result!.error)
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
      <FormProvider {...methods}>
        <View style={[styles.container, {padding: 20}]}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
          />
          {/* Email Input */}
          <InputField
            name="email"
            placeholder="Email or Phone Number"
            keyboardType="email-address"
            rules={{
              required: "Enter the fockhing email address broo!!",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Does it look like a valid email address to you? duh!",
              },
            }}
          />
          {/* Password Input */}
          <InputField
            name="password"
            placeholder="Password"
            secureTextEntry
            rules={{
              required: "Why would I let you in without the password? lol",
              minLength: {
                value: 6,
                message: "Your dijk is too short, must be at least 6 inches",
              },
            }}
          />
          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={methods.handleSubmit(onSubmit)}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
          <View style={styles.footer}>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createAccountButton} onPress={() => navigation.navigate("Registration")}>
              <Text style={styles.createAccountText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </FormProvider>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  logo: {
    width: 90,
    height: 60,
    marginBottom: 150,
    borderRadius: 50,
  },
  loginButton: {
    backgroundColor: colors.blue,
    width: "100%",
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: "center",
    marginVertical: 15,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
  },
  forgotPassword: {
    color: "#1877f2",
    fontSize: 14,
    marginBottom: 20,
  },
  createAccountButton: {
    borderWidth: 1,
    borderColor: "#1877f2",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  createAccountText: {
    color: "#1877f2",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MessengerLoginScreen;
