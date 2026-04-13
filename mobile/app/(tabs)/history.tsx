import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { startOfMonth, subMonths, addMonths, format, isSameMonth } from 'date-fns';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { MonthlyHeatmap } from '../../components/MonthlyHeatmap';
import { MonthlyReportCard } from '../../components/MonthlyReportCard';
import { DayDetailsModal } from '../../components/DayDetailsModal';
import { 
  formatDate, 
  formatTime, 
  formatShortDuration,
  calcSessionDurationMs 
} from '../../lib/utils';

const DEFAULT_HOLIDAYS = ["0", "6"];

export default function HistoryScreen() {
  const { colors, theme } = useTheme();
  
  // Data State
  const [sessions, setSessions] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [settings, setSettings] = useState({ weeklyHolidays: DEFAULT_HOLIDAYS });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchHistory = useCallback(async (date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      // Load Settings
      const savedSettings = await SecureStore.getItemAsync('appSettings');
      if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ weeklyHolidays: parsed.weeklyHolidays || DEFAULT_HOLIDAYS });
      }

      const { data } = await api.get(`/history?month=${month}&year=${year}`);
      setSessions(data.sessions || []);
      setLeaves(data.leaves || []);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(selectedMonth);
  }, [selectedMonth, fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(selectedMonth);
  }, [selectedMonth, fetchHistory]);

  const isCurrentMonth = useMemo(() => isSameMonth(selectedMonth, new Date()), [selectedMonth]);
  
  const handlePrev = () => {
    setLoading(true);
    setSelectedMonth(prev => subMonths(prev, 1));
  };
  
  const handleNext = () => {
    if (!isCurrentMonth) {
        setLoading(true);
        setSelectedMonth(prev => addMonths(prev, 1));
    }
  };

  const handleDayPress = (day: Date) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const selectedLeave = useMemo(() => {
    if (!selectedDay) return null;
    return leaves.find(l => {
      const d = new Date(l.leave_date);
      return d.getFullYear() === selectedDay.getFullYear() && 
             d.getMonth() === selectedDay.getMonth() && 
             d.getDate() === selectedDay.getDate();
    });
  }, [selectedDay, leaves]);

  const recentSessions = useMemo(() => {
    return sessions.slice(0, 5).sort((a, b) => new Date(b.punch_in_time).getTime() - new Date(a.punch_in_time).getTime());
  }, [sessions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.foreground, fontWeight: '800' },
          headerTitle: 'Analytics & Logs',
          headerShadowVisible: false,
        }} 
      />
      
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
        {/* Month Navigator */}
        <View style={styles.monthNavigator}>
          <TouchableOpacity 
            onPress={handlePrev}
            style={[styles.navButton, { backgroundColor: colors.muted }]}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          
          <View style={styles.monthTitleContainer}>
            <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>
                {format(selectedMonth, 'yyyy')}
            </Text>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
                {format(selectedMonth, 'MMMM')}
            </Text>
          </View>

          <TouchableOpacity 
            onPress={handleNext}
            disabled={isCurrentMonth}
            style={[styles.navButton, { backgroundColor: colors.muted, opacity: isCurrentMonth ? 0.3 : 1 }]}
          >
            <ChevronRight size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Crunching logs...</Text>
            </View>
        ) : (
            <View style={styles.statsContainer}>
                <MonthlyReportCard 
                    monthDate={selectedMonth}
                    sessions={sessions}
                    leaves={leaves}
                    weeklyHolidays={settings.weeklyHolidays}
                />

                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleGroup}>
                        <CalendarIcon size={14} color={colors.mutedForeground} />
                        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Activity Heatmap</Text>
                    </View>
                    <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>TAP ANY DAY</Text>
                </View>

                <MonthlyHeatmap 
                    monthDate={selectedMonth}
                    sessions={sessions}
                    leaves={leaves}
                    weeklyHolidays={settings.weeklyHolidays}
                    onDayPress={handleDayPress}
                />

                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleGroup}>
                        <Clock size={14} color={colors.mutedForeground} />
                        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Recent Logs</Text>
                    </View>
                    <TouchableOpacity onPress={() => alert('Daily logs are now accessible by tapping days in the calendar!')}>
                        <Text style={[styles.viewMore, { color: colors.primary }]}>How to view all?</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sessionsList}>
                    {recentSessions.length === 0 ? (
                        <View style={styles.emptySessions}>
                            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activity this month</Text>
                        </View>
                    ) : (
                        recentSessions.map((item) => (
                            <TouchableOpacity 
                                key={item.id}
                                style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => handleDayPress(new Date(item.punch_in_time))}
                            >
                                <View style={styles.sessionInfo}>
                                    <View style={styles.sessionHeaderRow}>
                                        <Text style={[styles.sessionDate, { color: colors.foreground }]}>{formatDate(item.punch_in_time)}</Text>
                                        <Text style={[styles.sessionDuration, { color: colors.mutedForeground }]}>
                                            {formatShortDuration(calcSessionDurationMs(item, item.breaks))}
                                        </Text>
                                    </View>
                                    <Text style={[styles.sessionTime, { color: colors.mutedForeground }]}>
                                        {formatTime(item.punch_in_time)} — {item.punch_out_time ? formatTime(item.punch_out_time) : 'Ongoing'}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={colors.mutedForeground} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </View>
        )}
      </ScrollView>

      <DayDetailsModal 
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        day={selectedDay}
        sessions={sessions}
        leave={selectedLeave}
        onRefresh={() => fetchHistory(selectedMonth)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 2,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHint: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  viewMore: {
    fontSize: 10,
    fontWeight: '700',
  },
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptySessions: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  }
});
