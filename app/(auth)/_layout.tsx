import { Stack, useRouter } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Platform } from 'react-native';
import { useState } from 'react';
import { DropdownMenu, MenuItem } from '../../src/components/ui/DropdownMenu';

function AuthHeaderRight() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { 
      label: 'About OpenPharma', 
      icon: 'information-circle-outline', 
      onPress: () => router.push('/about') 
    },
    { 
      label: 'Privacy Policy', 
      icon: 'shield-checkmark-outline', 
      onPress: () => router.push('/(legal)/privacy') 
    },
    { 
      label: 'Terms of Service', 
      icon: 'document-text-outline', 
      onPress: () => router.push('/(legal)/tos') 
    },
  ];

  return (
    <View style={{ marginRight: Platform.OS === 'android' ? 8 : 0 }}>
      <TouchableOpacity 
        onPress={() => setMenuVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <DropdownMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        items={menuItems}
        anchorPosition={{ top: LayoutContentHeight(), right: 16 }}
      />
    </View>
  );
}

// Utility to estimate header height for dropdown positioning
const LayoutContentHeight = () => (Platform.OS === 'ios' ? 50 : 60);

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily.headline,
          fontWeight: '700',
        },
        headerRight: () => <AuthHeaderRight />,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
      }} 
    >
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="setup-profile" options={{ title: 'Complete Profile' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
    </Stack>
  );
}
