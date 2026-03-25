import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Play, Square, Coffee, Clock, RefreshCcw } from 'lucide-react-native';
import api from '../../lib/api';
import { formatDuration, calcSessionDurationMs } from '../../lib/utils';

export default function TimerScreen() {
  const [status, setStatus] = useState('off');
  const [session, setSession] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/status');
      setStatus(data.status || 'off');
      setSession(data.session || null);
      setActiveBreak(data.activeBreak || null);
      setBreaks(data.breaks || []);
    } catch (err) {
      console.error('Fetch status error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session && (status === 'working' || status === 'break')) {
      const update = () => {
        const finishedBreaks = breaks.filter(b => b.break_end);
        setElapsed(calcSessionDurationMs(session, finishedBreaks));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [session, status, breaks]);

  const handleAction = async (action: string, payload: any = {}) => {
    setLoading(true);
    try {
      if (action === 'punch_in' || action === 'punch_out') {
        await api.post('/session', { action, ...payload });
      } else if (action === 'start_break' || action === 'end_break') {
        await api.post('/break', { 
          action: action === 'start_break' ? 'start' : 'end', 
          ...payload 
        });
      }
      await fetchStatus();
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const isWorking = status === 'working';
  const isOnBreak = status === 'break';
  const isOff = status === 'off';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStatus(); }} />
      }
    >
      <View style={styles.timerContainer}>
        <View style={[styles.statusBadge, isWorking && styles.workingBadge, isOnBreak && styles.breakBadge]}>
          <Text style={styles.statusText}>
            {status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      <View style={styles.controlsContainer}>
        {isOff ? (
          <TouchableOpacity 
            style={[styles.mainButton, styles.punchInButton]} 
            onPress={() => handleAction('punch_in')}
          >
            <Play size={32} color="#fff" />
            <Text style={styles.mainButtonText}>Punch In</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <View style={styles.breakRow}>
              {isOnBreak ? (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.endBreakButton]}
                  onPress={() => handleAction('end_break', { breakId: activeBreak?.id })}
                >
                  <Play size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>End Break</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.startBreakButton]}
                  onPress={() => handleAction('start_break', { sessionId: session?.id })}
                >
                  <Coffee size={24} color="#000" />
                  <Text style={[styles.actionButtonText, { color: '#000' }]}>Start Break</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.mainButton, styles.punchOutButton]} 
              onPress={() => handleAction('punch_out', { sessionId: session?.id })}
            >
              <Square size={32} color="#fff" />
              <Text style={styles.mainButtonText}>Punch Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Clock size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Started At</Text>
            <Text style={styles.infoValue}>
              {session ? new Date(session.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Coffee size={20} color="#666" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Total Breaks</Text>
            <Text style={styles.infoValue}>{breaks.length}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#9ca3af',
    marginBottom: 16,
  },
  workingBadge: {
    backgroundColor: '#10b981',
  },
  breakBadge: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '800',
    color: '#111',
    fontVariant: ['tabular-nums'],
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  controlsContainer: {
    padding: 24,
  },
  activeControls: {
    gap: 16,
  },
  breakRow: {
    flexDirection: 'row',
  },
  mainButton: {
    height: 100,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  punchInButton: {
    backgroundColor: '#000',
  },
  punchOutButton: {
    backgroundColor: '#ef4444',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  startBreakButton: {
    backgroundColor: '#fff',
  },
  endBreakButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    gap: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
});
