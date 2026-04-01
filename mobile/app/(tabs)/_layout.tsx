import React from 'react';
import { Tabs } from 'expo-router';
import { Clock, History, User } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TabsLayout() {
  const { colors, theme } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: 64,
        paddingBottom: 10,
        paddingTop: 8,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTitleStyle: {
        fontWeight: '800',
        color: colors.foreground,
        fontSize: 18,
      },
      headerShown: true,
      headerTitleAlign: 'left',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          headerTitle: 'TimeTrack',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          headerTitle: 'Session History',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerTitle: 'Account',
        }}
      />
      <Tabs.Screen
        name="manual"
        options={{
          href: null, // Hide from tab bar
          headerTitle: 'Manual Entry',
        }}
      />
    </Tabs>
  );
}
