import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Shield, Bell, Moon, LogOut, ChevronRight, Clock, Globe, CalendarDays, ExternalLink, HelpCircle } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as Linking from 'expo-linking';

const TIMEZONES = [
  { label: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'London', value: 'Europe/London' },
  { label: 'New York', value: 'America/New_York' },
  { label: 'Singapore', value: 'Asia/Singapore' },
];

const DAYS = [
  { label: 'S', value: '0', name: 'Sunday' },
  { label: 'M', value: '1', name: 'Monday' },
  { label: 'T', value: '2', name: 'Tuesday' },
  { label: 'W', value: '3', name: 'Wednesday' },
  { label: 'T', value: '4', name: 'Thursday' },
  { label: 'F', value: '5', name: 'Friday' },
  { label: 'S', value: '6', name: 'Saturday' },
];

export default function ProfileScreen() {
  const { user, signOut, performAction, refreshSettings, isAuth, clearPendingSyncs } = useAuth();
  const { theme, colors, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [breakHours, setBreakHours] = useState('1');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [weeklyHolidays, setWeeklyHolidays] = useState<string[]>(['0', '6']);

  // Load settings on mount
  useEffect(() => {
    const init = async () => {
      if (isAuth) await refreshSettings();
      const saved = await SecureStore.getItemAsync('appSettings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.app_start_time) setStartTime(s.app_start_time);
        if (s.app_end_time) setEndTime(s.app_end_time);
        if (s.app_break_hours) setBreakHours(s.app_break_hours.toString());
        if (s.app_timezone) setTimezone(s.app_timezone);
        if (s.app_weekly_holidays) setWeeklyHolidays(s.app_weekly_holidays);
      }
      setLoading(false);
    };
    init();
  }, [isAuth, refreshSettings]);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const toggleHoliday = (day: string) => {
    setWeeklyHolidays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    const settings = {
      app_start_time: startTime,
      app_end_time: endTime,
      app_break_hours: parseFloat(breakHours) || 1,
      app_timezone: timezone,
      app_weekly_holidays: weeklyHolidays
    };

    try {
      await SecureStore.setItemAsync('appSettings', JSON.stringify(settings));
      await performAction({
        type: 'settings',
        endpoint: '/user/settings',
        method: 'PATCH',
        payload: { settings }
      });
      Alert.alert("Success", "Settings saved and syncing...");
    } catch (err) {
      Alert.alert("Error", "Failed to save settings locally");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.display_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.display_name || 'User'}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {/* Dynamic Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OFFICE RULES</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconText}>
                <Clock size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Office Hours</Text>
              </View>
              <View style={styles.timeInputs}>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  style={[styles.timeInput, { color: colors.primary, backgroundColor: colors.muted }]}
                  placeholder="09:30"
                />
                <Text style={{ color: colors.mutedForeground }}>-</Text>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  style={[styles.timeInput, { color: colors.primary, backgroundColor: colors.muted }]}
                  placeholder="18:30"
                />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingItem}>
              <View style={styles.settingIconText}>
                <Globe size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>App Timezone</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 10 }}>
                <View style={styles.timezoneList}>
                  {TIMEZONES.map(tz => (
                    <TouchableOpacity
                      key={tz.value}
                      onPress={() => setTimezone(tz.value)}
                      style={[
                        styles.tzBadge,
                        { backgroundColor: timezone === tz.value ? colors.primary + '20' : colors.muted },
                        timezone === tz.value && { borderColor: colors.primary, borderWidth: 1 }
                      ]}
                    >
                      <Text style={[styles.tzText, { color: timezone === tz.value ? colors.primary : colors.mutedForeground }]}>
                        {tz.label.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.sectionHeader}>
               <CalendarDays size={18} color={colors.mutedForeground} />
               <Text style={[styles.settingLabel, { color: colors.foreground, marginLeft: 12 }]}>Weekly Holidays</Text>
            </View>
            <View style={styles.holidayGrid}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day.value}
                  onPress={() => toggleHoliday(day.value)}
                  style={[
                    styles.dayButton,
                    { backgroundColor: weeklyHolidays.includes(day.value) ? colors.primary : colors.muted }
                  ]}
                >
                  <Text style={[styles.dayText, { color: weeklyHolidays.includes(day.value) ? '#fff' : colors.mutedForeground }]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={saveSettings}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Rules & Sync</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconText}>
                <Moon size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Dark Mode</Text>
              </View>
              <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: colors.primary }} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('https://github.com/whoismidlaj')}>
              <View style={styles.settingIconText}>
                <HelpCircle size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Help & Guide</Text>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info & Developer Credits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SYNC STATUS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.settingItem} onPress={clearPendingSyncs}>
              <View style={styles.settingIconText}>
                <Shield size={20} color={colors.destructive} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Reset Sync Queue</Text>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Use if app is stuck "Syncing"</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.creditsSection}>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>v1.2.0 Seamless</Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://midlaj.com')}
              style={styles.creditsLink}
            >
              <Text style={[styles.creditsText, { color: colors.mutedForeground }]}>
                built by <Text style={{ color: colors.primary, fontWeight: '700' }}>@whoismidlaj</Text>
              </Text>
              <ExternalLink size={10} color={colors.primary} />
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: colors.destructive }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 14, fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', paddingVertical: 8 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingIconText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  subLabel: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.7 },
  divider: { height: 1, marginHorizontal: 16 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { width: 70, height: 36, borderRadius: 10, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  timezoneList: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  tzBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  tzText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  holidayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  dayButton: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 13, fontWeight: '800' },
  saveButton: { marginHorizontal: 16, marginBottom: 12, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  creditsSection: { alignItems: 'center', marginVertical: 30, gap: 6 },
  versionText: { fontSize: 11, fontWeight: '700', opacity: 0.6 },
  creditsLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditsText: { fontSize: 12, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 10, marginBottom: 40 },
  logoutText: { fontSize: 16, fontWeight: '700' }
});
