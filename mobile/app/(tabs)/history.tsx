import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, SectionList, SafeAreaView } from 'react-native';
import { Calendar, Clock, ChevronRight, Plus, Coffee, PenSquare } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import SessionDetailModal from '../../components/SessionDetailModal';
import EditSessionModal from '../../components/EditSessionModal';
import { 
  formatDuration, 
  formatDate, 
  formatTime, 
  formatShortDuration,
  calcSessionDurationMs,
  calcTotalBreakMs 
} from '../../lib/utils';

export default function HistoryScreen() {
  const { colors, theme } = useTheme();
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/history?type=recent&limit=50');
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: { title: string, data: any[], totalMs: number } } = {};
    
    sessions.forEach(session => {
      const dateKey = formatDate(session.punch_in_time);
      if (!groups[dateKey]) {
        groups[dateKey] = { title: dateKey, data: [], totalMs: 0 };
      }
      
      const durationMs = session.punch_out_time 
        ? calcSessionDurationMs(session, session.breaks) 
        : 0;
        
      groups[dateKey].data.push(session);
      groups[dateKey].totalMs += durationMs;
    });

    return Object.values(groups);
  }, [sessions]);

  const handleSessionPress = (session: any) => {
    setSelectedSession(session);
    setDetailVisible(true);
  };

  const handleEditPress = (session: any) => {
    setSelectedSession(session);
    setDetailVisible(false);
    setEditVisible(true);
  };

  const handleManualEntry = () => {
    setSelectedSession(null);
    setEditVisible(true);
  };

  const renderSession = ({ item }: { item: any }) => {
    const isActive = !item.punch_out_time;
    const durationMs = item.punch_out_time ? calcSessionDurationMs(item, item.breaks) : 0;
    const breakMs = calcTotalBreakMs(item.breaks || []);

    return (
      <TouchableOpacity 
        style={[
          styles.sessionCard, 
          { backgroundColor: colors.card, borderColor: colors.border },
          isActive && { backgroundColor: theme === 'light' ? '#f0fdf4' : '#065f4620', borderColor: theme === 'light' ? '#dcfce7' : '#065f4650' }
        ]}
        activeOpacity={0.7}
        onPress={() => handleSessionPress(item)}
      >
        <View style={styles.sessionInfo}>
          <View style={styles.timeHeader}>
            <Text style={[styles.timeRange, { color: colors.foreground }]}>
              {formatTime(item.punch_in_time)} — {item.punch_out_time ? formatTime(item.punch_out_time) : 'Ongoing'}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>WORK</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {isActive ? '—' : formatShortDuration(durationMs)}
              </Text>
            </View>
            {breakMs > 0 && (
              <View style={styles.metaItem}>
                <Coffee size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>BREAK</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>{formatShortDuration(breakMs)}</Text>
              </View>
            )}
          </View>

          {item.notes && (
            <Text style={[styles.notesPreview, { color: colors.mutedForeground, borderLeftColor: colors.border }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
      <View style={[styles.sectionTotal, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '10' }]}>
        <Text style={[styles.sectionTotalText, { color: colors.primary }]}>{formatShortDuration(section.totalMs)}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.foreground, fontWeight: '800' },
          headerTitle: 'Activity History',
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleManualEntry}
              style={[styles.headerButton, { backgroundColor: colors.primary + '15' }]}
            >
              <Plus size={18} color={colors.primary} />
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>Manual</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <SectionList
        sections={groupedSessions}
        renderItem={renderSession}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchHistory(); }} 
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={colors.mutedForeground + '40'} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No sessions found yet</Text>
          </View>
        }
      />

      {/* Modals */}
      <SessionDetailModal 
        session={selectedSession}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onEdit={handleEditPress}
      />

      <EditSessionModal 
        session={selectedSession}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onRefresh={fetchHistory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 16,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionTotal: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionTotalText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionInfo: {
    flex: 1,
    gap: 10,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesPreview: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
