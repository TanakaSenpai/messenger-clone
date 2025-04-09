import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Controller, Control, FieldError } from 'react-hook-form';
import colors from 'app/configs/colors';

interface FormPickerProps {
  control: Control<any>;
  name: string;
  label?: string;
  rules?: Record<string, any>;
  items: Array<{ label: string; value: string | number }>;
  placeholder?: string;
  error?: FieldError;
}

const FormPicker: React.FC<FormPickerProps> = ({
  control,
  name,
  label,
  rules,
  items,
  placeholder = 'Select an option',
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
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={styles.picker}
            >
              <Picker.Item
                color={colors.lightGray}
                label={placeholder}
                value=""
              />
              {items.map((item) => (
                <Picker.Item
                  key={item.value.toString()}
                  label={item.label}
                  value={item.value}
                  color={colors.white}
                />
              ))}
            </Picker>
          </View>
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
  pickerContainer: {
    backgroundColor: colors.darkGray,
    borderRadius: 25,
    overflow: 'hidden',
  },
  picker: {
    color: colors.white,
    width: '100%',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
});

export default FormPicker;