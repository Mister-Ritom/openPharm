import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DropdownMenu } from '../../src/components/ui/DropdownMenu';
import { theme } from '../../src/theme/designSystem';

// Using Ionicons for a professional look
const TabIcon = ({ focused, color, name }: { focused: boolean, color: string, name: string }) => {
  let iconName: any = name;
  if (name === 'home') iconName = focused ? 'home' : 'home-outline';
  else if (name === 'scan') iconName = focused ? 'barcode' : 'barcode-outline';
  else if (name === 'history') iconName = focused ? 'time' : 'time-outline';
  else if (name === 'profile') iconName = focused ? 'person' : 'person-outline';

  return (
    <Ionicons name={iconName} size={24} color={color} />
  );
};

const HeaderRight = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              try { await GoogleSignin.signOut(); } catch (e) {}
              await auth().signOut();
            } catch (e) {
              Alert.alert("Error", "Failed to sign out.");
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    { label: 'About', icon: 'information-circle-outline' as any, onPress: () => router.push('/about') },
    { label: 'Privacy Policy', icon: 'shield-checkmark-outline' as any, onPress: () => router.push('/privacy') },
    { label: 'Terms of Service', icon: 'document-text-outline' as any, onPress: () => router.push('/tos') },
    { label: 'Log Out', icon: 'log-out-outline' as any, onPress: handleLogout, destructive: true },
  ];

  return (
    <View style={{ marginRight: 16 }}>
      <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <DropdownMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        items={menuItems}
        anchorPosition={{ top: 56, right: 16 }}
      />
    </View>
  );
};

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily.display,
          fontSize: 18,
          fontWeight: '800',
          color: theme.colors.onSurface,
        },
        headerRight: () => <HeaderRight />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.body,
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'OpenPharma',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />
        }} 
      />
      
      <Tabs.Screen 
        name="scan" 
        options={{ 
          title: 'Scan',
          headerShown: false, // Keep full screen for camera
          tabBarIcon: ({ color, focused }) => <TabIcon name="scan" color={color} focused={focused} />
        }} 
      />
      
      <Tabs.Screen 
        name="history" 
        options={{ 
          title: 'History',
          tabBarIcon: ({ color, focused }) => <TabIcon name="history" color={color} focused={focused} />
        }} 
      />
      
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon name="profile" color={color} focused={focused} />
        }} 
      />

      <Tabs.Screen 
        name="result" 
        options={{ 
          href: null,
          headerShown: false, // Result screen has its own internal header
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  }
});
