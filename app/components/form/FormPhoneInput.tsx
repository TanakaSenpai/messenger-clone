import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import { Controller, Control, FieldError } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';

import colors from 'app/configs/colors';

interface FormPhoneInputProps {
  control: Control<any>;
  name: string;
  label?: string;
  rules?: Record<string, any>;
  defaultCode?: string;
  error?: FieldError;
}

const FormPhoneInput: React.FC<FormPhoneInputProps> = ({
  control,
  name,
  label,
  rules,
  error,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { onChange, value } }) => (
          <PhoneInput
            withDarkTheme
            defaultValue={value}
            defaultCode="BD"
            onChangeFormattedText={onChange}
            containerStyle={styles.phoneContainer}
            textContainerStyle={styles.textContainer}
            textInputStyle={styles.textInput}
            codeTextStyle={styles.codeText}
            flagButtonStyle={styles.flagButton}
            renderDropdownImage={
              <Icon name="arrow-drop-down" size={24} color={colors.white} />
            }
          />
        )}
      />
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: '100%',
  },
  label: {
    color: colors.white,
    marginBottom: 5,
  },
  phoneContainer: {
    width: '100%',
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    overflow: 'hidden',
  },
  textContainer: {
    backgroundColor: colors.darkGray,
  },
  textInput: {
    color: colors.white,
  },
  codeText: {
    color: colors.white,
    textAlignVertical: "center"
  },
  flagButton: {
    width: 50,
    marginLeft: 20
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
});

export default FormPhoneInput;