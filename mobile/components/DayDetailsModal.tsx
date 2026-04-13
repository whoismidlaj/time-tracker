import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { X, Calendar, Clock, Heart, User, Home, Sparkles, AlertCircle } from 'lucide-react-native';
import { format, isSameDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { formatShortDuration, formatTime } from '../lib/utils';
import api from '../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  day: Date | null;
  sessions: any[];
  leave: any | null;
  onRefresh: () => void;
}

export function DayDetailsModal({ visible, onClose, day, sessions, leave, onRefresh }: Props) {
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [customNotes, setCustomNotes] = useState(leave?.notes || "");

  const daySessions = useMemo(() => {
    if (!day) return [];
    return sessions.filter((s: any) => isSameDay(new Date(s.punch_in_time), day));
  }, [day, sessions]);

  useEffect(() => {
    if (visible) {
      setCustomNotes(leave?.notes || "");
    }
  }, [visible, leave]);

  if (!day) return null;

  const handleLeaveSelect = async (type: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const dateStr = format(day, "yyyy-MM-dd");
      const isRemoving = type === leave?.leave_type;
      
      await api.post("/leaves", {
        date: dateStr,
        type: isRemoving ? null : type,
        notes: (type === 'other' && !isRemoving) ? customNotes : null
      });
      onRefresh();
    } catch (err) {
      console.error('Leave select error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomNotes = async () => {
    if (!leave || leave.leave_type !== 'other' || customNotes === leave.notes) return;
    setLoading(true);
    try {
      const dateStr = format(day, "yyyy-MM-dd");
      await api.post("/leaves", {
        date: dateStr,
        type: 'other',
        notes: customNotes
      });
      onRefresh();
    } catch (err) {
      console.error('Save custom notes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const leaveTypes = [
    { id: "sick", label: "Sick", icon: Heart, color: "#f43f5e" },
    { id: "casual", label: "Casual", icon: User, color: "#0ea5e9" },
    { id: "wfh", label: "WFH", icon: Home, color: "#14b8a6" },
    { id: "other", label: "Other", icon: Sparkles, color: "#8b5cf6" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{format(day, "EEEE, MMM do")}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Daily Archive</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <X size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Tracked Sessions</Text>
                <Text style={[styles.sessionCount, { color: colors.primary }]}>{daySessions.length} total</Text>
              </View>

              {daySessions.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border + '50' }]}>
                  <AlertCircle size={20} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No sessions found</Text>
                </View>
              ) : (
                <View style={styles.sessionList}>
                  {daySessions.map((s: any, i: number) => {
                    const duration = s.punch_out_time ? new Date(s.punch_out_time).getTime() - new Date(s.punch_in_time).getTime() : 0;
                    return (
                      <View key={s.id} style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.sessionTimeRow}>
                          <View style={styles.timeCluster}>
                            <Text style={[styles.punchText, { color: '#10b981' }]}>{formatTime(s.punch_in_time)}</Text>
                            <Text style={[styles.arrow, { color: colors.mutedForeground }]}>→</Text>
                            <Text style={[styles.punchText, { color: s.punch_out_time ? '#f59e0b' : colors.primary }]}>
                              {s.punch_out_time ? formatTime(s.punch_out_time) : "Live"}
                            </Text>
                          </View>
                          <Text style={[styles.durationText, { color: colors.mutedForeground }]}>{formatShortDuration(duration)}</Text>
                        </View>
                        {s.notes && (
                          <Text style={[styles.sessionNotes, { color: colors.mutedForeground, borderTopColor: colors.border + '20' }]} numberOfLines={1}>
                            {s.notes}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 12 }]}>Mark Attendance Status</Text>
              <View style={styles.leaveGrid}>
                {leaveTypes.map((t) => {
                  const isActive = leave?.leave_type === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      disabled={loading}
                      onPress={() => handleLeaveSelect(t.id)}
                      style={[
                        styles.leaveButton,
                        { borderColor: colors.border + '40', backgroundColor: colors.card },
                        isActive && { borderColor: t.color, backgroundColor: t.color + '15' }
                      ]}
                    >
                      <t.icon size={20} color={isActive ? t.color : colors.mutedForeground} style={{ opacity: isActive ? 1 : 0.5 }} />
                      <Text style={[styles.leaveLabel, { color: isActive ? colors.foreground : colors.mutedForeground }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {leave?.leave_type === 'other' && (
                <View style={styles.otherInputContainer}>
                  <TextInput
                    style={[styles.otherInput, { backgroundColor: colors.muted + '30', borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Name this leave (e.g. Holiday)"
                    placeholderTextColor={colors.mutedForeground + '60'}
                    value={customNotes}
                    onChangeText={setCustomNotes}
                    onBlur={handleSaveCustomNotes}
                  />
                  {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.inputLoading} />}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxHeight: '80%',
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleGroup: {
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
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    marginHorizontal: -4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sessionCount: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionList: {
    gap: 10,
  },
  sessionCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  sessionTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punchText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  arrow: {
    fontSize: 12,
    opacity: 0.3,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sessionNotes: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  leaveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  leaveButton: {
    flex: 1,
    minWidth: '45%',
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  leaveLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  otherInputContainer: {
    marginTop: 12,
    position: 'relative',
  },
  otherInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
  },
  inputLoading: {
    position: 'absolute',
    right: 12,
    top: 14,
  }
});
