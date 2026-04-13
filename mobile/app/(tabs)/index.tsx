import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Square, Coffee, Clock, MessageSquare, LogOut, RefreshCcw, Cloud, CloudOff } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getDay } from 'date-fns';
import api from '../../lib/api';
import SyncManager from '../../lib/SyncManager';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  formatDuration, 
  calcSessionDurationMs, 
  calcTotalBreakMs, 
  calcExitTime, 
  formatTime,
  formatShortDuration
} from '../../lib/utils';

export default function TimerScreen() {
  const { colors, theme } = useTheme();
  const { 
    performAction, 
    syncStatus, 
    status, 
    session, 
    activeBreak, 
    breaks, 
    serverOffset,
    refreshStatus,
    updateState
  } = useAuth();

  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Weekend / Holiday detection
  const isHoliday = useMemo(() => {
    if (!settings?.weeklyHolidays) return false;
    return settings.weeklyHolidays.includes(getDay(new Date()).toString());
  }, [settings?.weeklyHolidays]);

  // Pulse animation for active status
  useEffect(() => {
    if (status !== 'off') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // Load settings and sync initial notes
  useEffect(() => {
    const init = async () => {
      const savedSettings = await SecureStore.getItemAsync('appSettings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      if (session?.notes) setNotes(session.notes);
      setLoading(false);
    };
    init();
  }, [session?.notes]);

  // Update local notes when session changes (from sync)
  useEffect(() => {
    if (session?.notes !== undefined && !savingNotes) {
      setNotes(session.notes || '');
    }
  }, [session?.id, session?.notes, savingNotes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshStatus();
    setRefreshing(false);
  }, [refreshStatus]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session && (status === 'working' || status === 'break')) {
      const update = () => {
        const nowMs = Date.now() - serverOffset;
        setElapsed(calcSessionDurationMs(session, breaks, nowMs));
      };
      update();
      timerRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, status, breaks]);

  const handleAction = async (actionType: string, payload: any = {}) => {
    const timestamp = new Date().toISOString();
    
    // --- Optimistic State Update ---
    let newStatus = status;
    let newSession = session ? { ...session } : null;
    let newActiveBreak = activeBreak ? { ...activeBreak } : null;
    let newBreaks = [...breaks];

    if (actionType === 'punch_in') {
      newStatus = 'working';
      newSession = { punch_in_time: timestamp, id: 'tmp-' + Date.now(), notes: '' };
    } else if (actionType === 'punch_out') {
      newStatus = 'off';
      newSession = null;
      newActiveBreak = null;
      newBreaks = [];
    } else if (actionType === 'start_break') {
      newStatus = 'break';
      newActiveBreak = { break_start: timestamp, id: 'tmp-b-' + Date.now() };
    } else if (actionType === 'end_break') {
      newStatus = 'working';
      if (newActiveBreak) {
        newBreaks.push({ ...newActiveBreak, break_end: timestamp });
        newActiveBreak = null;
      }
    }

    // Update global state immediately
    updateState({
      status: newStatus,
      session: newSession,
      activeBreak: newActiveBreak,
      breaks: newBreaks
    });

    const endpoint = (actionType === 'punch_in' || actionType === 'punch_out') ? '/session' : '/break';
    const actionPayload = {
      action: actionType === 'start_break' ? 'start' : actionType === 'end_break' ? 'end' : actionType,
      sessionId: session?.id,
      breakId: activeBreak?.id,
      offlineSessionId: newSession?.id,
      offlineBreakId: newActiveBreak?.id,
      ...payload,
      timestamp
    };

    await performAction({
      type: 'session',
      endpoint,
      method: 'POST',
      payload: actionPayload
    });
  };

  const saveNotes = async () => {
    if (!session) return;
    setSavingNotes(true);
    try {
      await performAction({
        type: 'session',
        endpoint: `/session/${session.id}`,
        method: 'PATCH',
        payload: { notes }
      });
    } catch (err) {
      console.error('Save notes error:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const syncIndicator = () => {
    let Icon = Cloud;
    let text = 'Synced';
    let color = colors.mutedForeground;

    if (syncStatus === 'syncing') {
      Icon = RefreshCcw;
      text = 'Syncing...';
      color = colors.primary;
    } else if (syncStatus === 'offline') {
      Icon = CloudOff;
      text = 'Offline Mode';
      color = '#f59e0b';
    } else if (syncStatus === 'error') {
      Icon = LogOut;
      text = 'Sign In Required';
      color = colors.destructive;
    }

    return (
      <TouchableOpacity 
        onPress={() => syncStatus === 'error' && refreshStatus()}
        style={[styles.syncIndicator, { backgroundColor: color + (theme === 'light' ? '15' : '25') }]}
      >
        <Icon size={12} color={color} />
        <Text style={[styles.syncText, { color }]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  const isWorking = status === 'working';
  const isBreak = status === 'break';
  const isOff = status === 'off';

  const totalBreakMs = calcTotalBreakMs(breaks);
  const exitTime = session ? calcExitTime(session.punch_in_time, totalBreakMs, settings) : null;
  const currentBreakMs = isBreak && activeBreak 
    ? Date.now() - new Date(activeBreak.break_start).getTime() 
    : 0;

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs.Screen 
        options={{
          headerTitle: 'TimeTrack',
          headerRight: () => (
            <View style={{ marginRight: 20 }}>
              {syncIndicator()}
            </View>
          ),
          headerTitleAlign: 'left',
        }} 
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.mainContent}>
            <View style={[
              styles.statusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              isWorking && { backgroundColor: theme === 'light' ? '#f0fdf4' : '#064e3b20', borderColor: theme === 'light' ? '#dcfce7' : '#065f4650' },
              isBreak && { backgroundColor: theme === 'light' ? '#fffbeb' : '#451a0320', borderColor: theme === 'light' ? '#fef3c7' : '#78350f50' }
            ]}>
              <View style={[
                styles.ambientGlow,
                { backgroundColor: isWorking ? '#10b981' : isBreak ? '#f59e0b' : colors.mutedForeground, opacity: theme === 'light' ? 0.05 : 0.1 }
              ]} />

              <View style={styles.cardHeader}>
                <View style={styles.statusRow}>
                  <View style={styles.dotContainer}>
                    {!isOff && (
                      <Animated.View style={[
                        styles.statusPing,
                        { backgroundColor: isWorking ? '#10b981' : '#f59e0b' },
                        { transform: [{ scale: pulseAnim }] }
                      ]} />
                    )}
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: isWorking ? '#10b981' : isBreak ? '#f59e0b' : isHoliday ? '#14b8a6' : colors.mutedForeground }
                    ]} />
                  </View>
                  <View style={[
                    styles.badge, 
                    { backgroundColor: isWorking ? '#dcfce7' : isBreak ? '#fef3c7' : isHoliday ? '#ccfbf1' : colors.muted },
                    theme === 'dark' && { backgroundColor: isWorking ? '#065f4640' : isBreak ? '#78350f40' : isHoliday ? '#134e4a40' : colors.muted }
                  ]}>
                    <Text style={[
                      styles.statusLabel, 
                      { color: isWorking ? '#166534' : isBreak ? '#92400e' : isHoliday ? '#0f766e' : colors.mutedForeground, paddingHorizontal: 4 },
                      theme === 'dark' && { color: isWorking ? '#34d399' : isBreak ? '#fbbf24' : isHoliday ? '#2dd4bf' : colors.mutedForeground }
                    ]}>
                      {status === 'off' ? (isHoliday ? 'Weekend' : 'Offline') : status === 'working' ? 'Working' : 'On Break'}
                    </Text>
                  </View>
                </View>
                
                {session && !isOff && (
                  <View style={[styles.inTimeContainer, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.inTimeText, { color: colors.mutedForeground }]}>
                      IN: {formatTime(session.punch_in_time)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.timerDisplay}>
                <Text style={[
                  styles.timerText, 
                  { color: colors.foreground },
                  isOff && { color: colors.mutedForeground + '40' },
                  isBreak && { color: '#f59e0b' }
                ]}>
                  {isOff ? '--:--:--' : formatDuration(elapsed)}
                </Text>
                <Text style={[styles.timerSubText, { color: colors.mutedForeground }]}>
                  {isOff ? 'STATUS: INACTIVE' : isBreak ? 'SESSION NET WORK TIME' : 'ACTIVE SESSION TIME'}
                </Text>
              </View>

              {!isOff && session && (
                <View style={styles.notesContainer}>
                  <View style={styles.notesHeader}>
                    <MessageSquare size={12} color={colors.mutedForeground} />
                    <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>SESSION NOTES</Text>
                    {savingNotes && <ActivityIndicator size="small" color={colors.primary}  />}
                  </View>
                  <TextInput
                    style={[
                      styles.notesInput, 
                      { 
                        backgroundColor: theme === 'light' ? '#fff' : colors.background, 
                        borderColor: colors.border,
                        color: colors.foreground 
                      }
                    ]}
                    placeholder="Update notes..."
                    placeholderTextColor={colors.mutedForeground + '60'}
                    value={notes}
                    onChangeText={setNotes}
                    onBlur={saveNotes}
                    multiline
                  />
                </View>
              )}

              {isBreak && (
                <View style={[styles.breakTimerRow, { borderTopColor: colors.border + '40' }]}>
                  <Text style={[styles.breakTimerLabel, { color: colors.mutedForeground }]}>CURRENT BREAK</Text>
                  <Text style={[styles.breakTimerValue, { color: '#f59e0b' }]}>{formatDuration(currentBreakMs)}</Text>
                </View>
              )}

              {!isOff && (
                <View style={[styles.metricsContainer, { borderTopColor: colors.border + '40' }]}>
                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>BREAKS LOGGED</Text>
                    <Text style={[styles.metricValue, { color: colors.foreground }]}>
                      {breaks.filter((b: any) => b.break_end).length} · {formatShortDuration(totalBreakMs)}
                    </Text>
                  </View>

                  {exitTime && (
                    <View style={[
                      styles.exitTimeBox, 
                      { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }
                    ]}>
                      <View style={styles.exitTimeInfo}>
                        <View style={[styles.exitIconContainer, { backgroundColor: colors.primary + '20' }]}>
                          <LogOut size={14} color={colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.exitLabel, { color: colors.mutedForeground }]}>ESTIMATED EXIT</Text>
                          <Text style={[styles.exitValue, { color: colors.foreground }]}>{formatTime(exitTime)}</Text>
                        </View>
                      </View>
                      <View style={styles.officeRuleInfo}>
                        <Text style={[styles.ruleLabel, { color: colors.mutedForeground }]}>Total Stay</Text>
                        <Text style={[styles.ruleValue, { color: colors.primary }]}>
                          {settings?.startTime || '09:30'} - {settings?.endTime || '18:30'} Rule
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.controlsWrapper}>
              {isOff ? (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.primaryButton, { backgroundColor: colors.foreground }]} 
                  onPress={() => handleAction('punch_in')}
                >
                  <View style={[styles.buttonIcon, { backgroundColor: colors.background + '20' }]}>
                    <Play size={20} color={colors.background} />
                  </View>
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>Punch In</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionRow}>
                  {isBreak ? (
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                      onPress={() => handleAction('end_break', { breakId: activeBreak?.id })}
                    >
                      <Play size={18} color="#fff" />
                      <Text style={[styles.actionButtonText, { color: '#fff' }]}>End Break</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      style={[styles.actionButton, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => handleAction('start_break', { sessionId: session?.id })}
                    >
                      <Coffee size={18} color={colors.foreground} />
                      <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Start Break</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={[styles.actionButton, { backgroundColor: colors.destructive }]}
                    onPress={() => handleAction('punch_out', { sessionId: session?.id })}
                  >
                    <Square size={16} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>Punch Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  syncText: { fontSize: 10, fontWeight: '800' },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mainContent: { padding: 24, gap: 24 },
  statusCard: { borderRadius: 28, padding: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, overflow: 'hidden', position: 'relative' },
  ambientGlow: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, zIndex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotContainer: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  statusPing: { position: 'absolute', width: 12, height: 12, borderRadius: 6, opacity: 0.4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  inTimeContainer: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  inTimeText: { fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  timerDisplay: { marginBottom: 28, zIndex: 1 },
  timerText: { fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2, lineHeight: 56 },
  timerSubText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 8, textTransform: 'uppercase' },
  notesContainer: { marginTop: 12, gap: 8, zIndex: 1 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  notesLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  notesInput: { borderRadius: 14, padding: 14, fontSize: 13, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, fontWeight: '500' },
  breakTimerRow: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  breakTimerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  breakTimerValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricsContainer: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, gap: 16, zIndex: 1 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  metricValue: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  exitTimeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 14, borderWidth: 1 },
  exitTimeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exitIconContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exitLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 1 },
  exitValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  officeRuleInfo: { alignItems: 'flex-end' },
  ruleLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  ruleValue: { fontSize: 10, fontWeight: '800', marginTop: 1 },
  controlsWrapper: { marginTop: 12 },
  primaryButton: { height: 68, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  buttonIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', gap: 14 },
  actionButton: { flex: 1, height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  actionButtonText: { fontSize: 16, fontWeight: '700' }
});
