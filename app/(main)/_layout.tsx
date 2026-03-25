import React from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />
        }} 
      />
      
      <Tabs.Screen 
        name="scan" 
        options={{ 
          title: 'Scan',
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
