import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);

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

  const onTimeChange = (event: any, selectedDate: Date | undefined, type: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      if (type === 'start') setShowStartPicker(false);
      else setShowEndPicker(false);
    }

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      if (type === 'start') setStartTime(timeStr);
      else setEndTime(timeStr);
    }
  };

  const getPickerDate = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m);
    return d;
  };

  const format12h = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
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
      refreshSettings(); // Sync current state
      Alert.alert("Success", "Settings updated!");
    } catch (err) {
      Alert.alert("Error", "Failed to save settings");
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <View style={styles.settingItemStacked}>
              <View style={styles.settingIconText}>
                <Clock size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Office Hours</Text>
              </View>
              <View style={styles.timeInputsStacked}>
                <TouchableOpacity 
                  onPress={() => setShowStartPicker(true)}
                  style={[styles.timeSelectorStacked, { backgroundColor: colors.muted }]}
                >
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>START</Text>
                  <Text style={[styles.timeSelectorText, { color: colors.primary }]}>{format12h(startTime)}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowEndPicker(true)}
                  style={[styles.timeSelectorStacked, { backgroundColor: colors.muted }]}
                >
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>END</Text>
                  <Text style={[styles.timeSelectorText, { color: colors.primary }]}>{format12h(endTime)}</Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={getPickerDate(startTime)}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  onChange={(e, d) => onTimeChange(e, d, 'start')}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={getPickerDate(endTime)}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  onChange={(e, d) => onTimeChange(e, d, 'end')}
                />
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingItemStacked}>
              <View style={styles.settingIconText}>
                <Globe size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>App Timezone</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowTzPicker(true)}
                style={[styles.tzSelectorStacked, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={[styles.tzSelectorText, { color: colors.foreground }]}>
                  {TIMEZONES.find(t => t.value === timezone)?.label || timezone}
                </Text>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
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
            <View style={styles.settingItemRow}>
              <View style={styles.settingIconText}>
                <Moon size={20} color={colors.mutedForeground} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Dark Mode</Text>
              </View>
              <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: colors.primary }} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingItemRow} onPress={() => Linking.openURL('https://github.com/whoismidlaj')}>
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
            <TouchableOpacity style={styles.settingItemStacked} onPress={clearPendingSyncs}>
              <View style={styles.settingIconText}>
                <Shield size={20} color={colors.destructive} />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Reset Sync Queue</Text>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Use if app is stuck "Syncing"</Text>
                </View>
              </View>
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

      {/* Timezone Selection Modal */}
      <Modal visible={showTzPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Timezone</Text>
            {TIMEZONES.map(tz => (
              <TouchableOpacity 
                key={tz.value} 
                onPress={() => { setTimezone(tz.value); setShowTzPicker(false); }}
                style={[styles.tzOption, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.tzOptionText, { color: timezone === tz.value ? colors.primary : colors.foreground }]}>
                  {tz.label}
                </Text>
                {timezone === tz.value && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowTzPicker(false)} style={styles.modalCloseBtn}>
              <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  settingItemStacked: { padding: 16, gap: 14 },
  settingItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingIconText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 16, fontWeight: '700' },
  subLabel: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.7 },
  divider: { height: 1, marginHorizontal: 16 },
  timeInputsStacked: { flexDirection: 'row', gap: 12, width: '100%' },
  timeSelectorStacked: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, gap: 2 },
  timeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  timeSelectorText: { fontSize: 16, fontWeight: '800' },
  tzSelectorStacked: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  tzSelectorText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  modalContent: { borderRadius: 24, padding: 24, gap: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  tzOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  tzOptionText: { fontSize: 15, fontWeight: '700' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  modalCloseBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
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
