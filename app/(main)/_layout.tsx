import React from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { View, StyleSheet } from 'react-native';

// Reusable SVG icons could be imported here, but we'll use simple shapes/views as placeholders for demonstration
const TabIcon = ({ focused, color, name }: { focused: boolean, color: string, name: string }) => {
  return (
    <View style={[styles.icon, { backgroundColor: focused ? color : 'transparent', borderWidth: focused ? 0 : 2, borderColor: color }]} />
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
