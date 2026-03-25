import React from 'react';
import { Tabs } from 'expo-router';
import { Clock, History, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#000',
      tabBarInactiveTintColor: '#666',
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        height: 60,
        paddingBottom: 10,
        paddingTop: 5,
      },
      headerShown: true,
      headerTitleStyle: {
        fontWeight: '700',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timer',
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
