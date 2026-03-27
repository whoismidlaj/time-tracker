import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar, Clock, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import api from '../../lib/api';
import { formatDuration } from '../../lib/utils';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const renderSession = ({ item }: { item: any }) => {
    const punchIn = new Date(item.punch_in_time);
    const punchOut = item.punch_out_time ? new Date(item.punch_out_time) : null;
    
    // Calculate duration
    let durationMs = 0;
    if (punchOut) {
      durationMs = punchOut.getTime() - punchIn.getTime();
      (item.breaks || []).forEach((b: any) => {
        if (b.break_start && b.break_end) {
          durationMs -= (new Date(b.break_end).getTime() - new Date(b.break_start).getTime());
        }
      });
    }

    return (
      <View style={styles.sessionCard}>
        <View style={styles.dateBlock}>
          <Text style={styles.dayText}>{punchIn.getDate()}</Text>
          <Text style={styles.monthText}>{punchIn.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
        </View>
        
        <View style={styles.detailsBlock}>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {punchIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' - '}
              {punchOut ? punchOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
            </Text>
            <View style={[styles.durationBadge, !punchOut && styles.ongoingBadge]}>
              <Text style={styles.durationText}>
                {punchOut ? formatDuration(durationMs) : 'LIVE'}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.breaks?.length || 0} breaks</Text>
            {item.notes ? (
              <Text style={styles.notesText} numberOfLines={1}>• {item.notes}</Text>
            ) : null}
          </View>
        </View>
        
        <ChevronRight size={16} color="#ccc" />
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/(tabs)/manual')} style={{ marginRight: 16 }}>
              <Plus size={24} color="#000" />
            </TouchableOpacity>
          ),
        }} 
      />
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={48} color="#e5e7eb" />
            <Text style={styles.emptyText}>No sessions found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dateBlock: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 8,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  monthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  detailsBlock: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  durationBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ongoingBadge: {
    backgroundColor: '#d1fae5',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notesText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
});
