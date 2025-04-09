import React from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import colors from "app/configs/colors";

interface InputFieldProps {
  name: string;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  rules?: object;
  style?: object;
}

const InputField: React.FC<InputFieldProps> = ({
  name,
  placeholder,
  secureTextEntry = false,
  autoCapitalize,
  keyboardType = "default",
  rules = {},
  style,
}) => {
  const { control, formState: { errors } } = useFormContext();

  return (
    <View style={[styles.container, style]}>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.errorInput]}
            placeholder={placeholder}
            placeholderTextColor={colors.lightGray}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
          />
        )}
      />
      {errors[name]?.message && typeof errors[name]?.message === "string" && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: "100%",
  },
  input: {
    width: "100%",
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.white,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
});

export default InputField;
