import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import colors from "app/configs/colors";
import { Register, User } from "app/api/auth";
import { AuthStackParamList } from "app/navigation/types";
import InputField from "app/components/form/InputField";
import FormPicker from "app/components/form/FormPicker";
import FormPhoneInput from "app/components/form/FormPhoneInput";

type RegistrationScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Registration"
>;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  gender: string;
  phoneNumber: string;
}

const RegistrationScreen = () => {
  const methods = useForm<User>();
  const navigation = useNavigation<RegistrationScreenNavigationProp>();
  const [isLoading, setLoading] = useState(false);

  const onSubmit = async (data: User) => {
    setLoading(true);
    const formattedPhoneNumber = data.phoneNumber.startsWith("+8800")
      ? data.phoneNumber.replace("+8800", "+880")
      : data.phoneNumber;
    if (data.gender === "") {
      methods.setError("gender", {
        type: "manual",
        message: "Please select your gender!",
      });
      return;
    } else if (data.phoneNumber === "") {
      methods.setError("phoneNumber", {
        type: "manual",
        message: "Please enter your phone number!",
      });
      return;
    } 

    data = {
      ...data,
      phoneNumber: formattedPhoneNumber.replace(/\s+/g, ""),
    };
    const result = await Register(data);
    let errorMessage;
    if (result.success) {
      console.log(result.user);
      errorMessage = "Reg done!";
    }

    if (result.error) {
      // Customize messages for specific Firebase errors
      if (result.error.includes("email-already-in-use")) {
        errorMessage = "This email is already registered";
      } else if (result.error.includes("weak-password")) {
        errorMessage = "Password should be at least 6 characters";
      } else if (result.error.includes("invalid-email")) {
        errorMessage = "Please enter a valid email address";
      } else {
        errorMessage = result.error;
      }
    }
    Alert.alert("Alert!", errorMessage);

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={{ width: "100%" }}>
        <View style={styles.container}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <Text style={styles.header}>Create your account</Text>
          <FormProvider {...methods}>
            <InputField
              name="firstName"
              placeholder="First Name"
              rules={{ required: "First Name is required" }}
            />
            <InputField
              name="lastName"
              placeholder="Last Name"
              rules={{ required: "Last Name is required" }}
            />
            <InputField
              name="username"
              placeholder="Username"
              rules={{ required: "Username is required" }}
            />
            <InputField
              name="address"
              placeholder="Address"
              rules={{ required: "Address is required" }}
            />

            {/* Gender Picker */}
            <FormPicker
              control={methods.control}
              name="gender"
              rules={{ required: "Gender is required" }}
              items={[
                { label: "Male", value: "male" },
                { label: "Female", value: "female" }
              ]}
              placeholder="Select Gender"
              error={methods.formState.errors.gender}
            />

            {/* Phone number input with react-native-phone-number-input */}
            <FormPhoneInput
              control={methods.control}
              name="phoneNumber"
              rules={{ required: "Phone number is required" }}
              defaultCode="BD"
              error={methods.formState.errors.phoneNumber}
            />

            <InputField
              name="email"
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              rules={{
                required: "Enter the fockhing email address broo!!",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message:
                    "Does it look like a valid email address to you? duh!",
                },
              }}
            />
            <InputField
              name="password"
              placeholder="Password"
              secureTextEntry
              rules={{
                required: "Why would I let you in without the password? lol",
                minLength: {
                  value: 6,
                  message: "Your password must be at least 6 characters long.",
                },
              }}
            />
            <TouchableOpacity
              disabled={isLoading}
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={methods.handleSubmit(onSubmit)}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Register</Text>
              )}
            </TouchableOpacity>
          </FormProvider>
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginText}>
                Already have an account? Log in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.black,
    padding: 20,
    marginTop: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 90,
    height: 60,
    marginBottom: 30,
    borderRadius: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.white,
  },
  pickerContainer: {
    width: "100%",
    marginBottom: 10,
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    marginVertical: 10,
    marginHorizontal: 15,
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
  disabledButton: {
    opacity: 0.7,
  },
  footer: {
    alignItems: "center",
  },
  loginText: {
    color: "#1877f2",
    fontSize: 14,
    marginTop: 10,
  },
  numberContainer: {
    width: "100%",
    marginBottom: 15,
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    paddingHorizontal: 10, // Fix horizontal spacing issue
    justifyContent: "center", // Align content properly
    flexDirection: "row", // Ensure flag and input are aligned
    alignItems: "center", // Vertically center flag and input
    overflow: "hidden",
  },
  textInputStyle: {
    color: colors.white,
    fontSize: 16,
  },
  codeTextStyle: {
    color: colors.white, // Change code text color to white
  },
  flagButtonStyle: {
    height: 40, // Adjust flag button height
    width: 40, // Adjust flag button width
  },
  dropdownIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white, // Ensure down arrow icon is white
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
    alignSelf: "flex-start",
    marginLeft: 15,
  },
});

export default RegistrationScreen;
