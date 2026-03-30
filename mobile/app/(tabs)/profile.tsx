import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, TextInput, Switch, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LogOut, User, Mail, Shield, Clock, Coffee, Globe, Save, Moon, Sun, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const DEFAULT_SETTINGS = {
  timezone: "Asia/Kolkata",
  startTime: "09:30",
  endTime: "18:30",
  breakHours: "1"
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, colors, toggleTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await SecureStore.getItemAsync('appSettings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    };
    loadSettings();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await SecureStore.setItemAsync('appSettings', JSON.stringify(settings));
      Alert.alert('Success', 'Settings saved successfully');
    } catch (err) {
      console.error('Save settings error:', err);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <User size={40} color={colors.mutedForeground} />
            )}
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{user.display_name || 'User'}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                {theme === 'dark' ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color={colors.primary} />}
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Dark Mode</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OFFICE SETTINGS</Text>
          
          <SettingInput
            icon={<Clock size={18} color={colors.mutedForeground} />}
            label="Start Time"
            value={settings.startTime}
            onChange={(v: string) => setSettings({ ...settings, startTime: v })}
            placeholder="09:30"
            colors={colors}
          />

          <SettingInput
            icon={<LogOut size={18} color={colors.mutedForeground} />}
            label="End Time"
            value={settings.endTime}
            onChange={(v: string) => setSettings({ ...settings, endTime: v })}
            placeholder="18:30"
            colors={colors}
          />

          <SettingInput
            icon={<Coffee size={18} color={colors.mutedForeground} />}
            label="Break Hours"
            value={settings.breakHours}
            onChange={(v: string) => setSettings({ ...settings, breakHours: v })}
            keyboardType="numeric"
            placeholder="1"
            colors={colors}
          />

          <SettingInput
            icon={<Globe size={18} color={colors.mutedForeground} />}
            label="Timezone"
            value={settings.timezone}
            onChange={(v: string) => setSettings({ ...settings, timezone: v })}
            placeholder="Asia/Kolkata"
            colors={colors}
          />

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]} 
            onPress={saveSettings}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Save size={18} color="#fff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Sync Settings'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Shield size={18} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.menuText, { color: colors.foreground }]}>Privacy & Security</Text>
            <ChevronRight size={16} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '20' }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>TimeTrack Mobile v1.5.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingInput({ icon, label, value, onChange, placeholder, keyboardType, colors }: any) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
          {icon}
        </View>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <TextInput
        style={[styles.settingInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
        value={value}
        onChangeText={(v: string) => onChange(v)}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground + '60'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
  },
  email: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'right',
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 32,
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginBottom: 48,
    fontSize: 12,
    fontWeight: '600',
  },
});
