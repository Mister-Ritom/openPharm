import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/designSystem';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  isEditable?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  style?: any;
}

export function EditableField({ 
  label, 
  value: initialValue, 
  onSave, 
  isEditable = false, 
  multiline = false,
  keyboardType = 'default',
  style
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(initialValue);

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(initialValue);
    setIsEditing(false);
  };

  if (!isEditable) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{initialValue || 'Not specified'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {!isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={tempValue}
            onChangeText={setTempValue}
            autoFocus
            multiline={multiline}
            keyboardType={keyboardType}
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.value}>{initialValue || `Tap pencil to set ${label.toLowerCase()}`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
    color: theme.colors.onSurface,
    paddingVertical: 4,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 2,
  }
});
