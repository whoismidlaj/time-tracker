import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, Coffee, Pencil, Calendar, ArrowRight, Trash2 } from 'lucide-react-native';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { 
  formatTime, 
  formatDate, 
  formatShortDuration, 
  calcSessionDurationMs, 
  calcTotalBreakMs 
} from '../lib/utils';

interface SessionDetailModalProps {
  session: any;
  visible: boolean;
  onClose: () => void;
  onEdit: (session: any) => void;
  onRefresh?: () => void;
}

export default function SessionDetailModal({ session, visible, onClose, onEdit, onRefresh }: SessionDetailModalProps) {
  const { colors, theme } = useTheme();
  const [deleting, setDeleting] = useState(false);

  if (!session) return null;

  const breaks = session.breaks || [];
  const totalBreakMs = calcTotalBreakMs(breaks);
  const workedMs = session.punch_out_time ? calcSessionDurationMs(session, breaks) : null;
  const isActive = !session.punch_out_time;

  const handleDelete = async () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to permanently delete this session?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/session/${session.id}`);
              onRefresh?.();
              onClose();
            } catch (err) {
              Alert.alert("Error", "Failed to delete session");
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Session Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.timeSection}>
              <View style={styles.timeColumn}>
                <View style={styles.labelRow}>
                  <Clock size={12} color="#10b981" />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>PUNCH IN</Text>
                </View>
                <Text style={[styles.timeText, { color: colors.foreground }]}>{formatTime(session.punch_in_time)}</Text>
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{formatDate(session.punch_in_time)}</Text>
              </View>

              <View style={styles.timeColumn}>
                <View style={styles.labelRow}>
                  <Clock size={12} color={session.punch_out_time ? "#ef4444" : "#10b981"} />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>PUNCH OUT</Text>
                </View>
                <Text style={[styles.timeText, { color: colors.foreground }]}>
                  {session.punch_out_time ? formatTime(session.punch_out_time) : "Ongoing"}
                </Text>
                {session.punch_out_time && (
                  <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{formatDate(session.punch_out_time)}</Text>
                )}
              </View>
            </View>

            <View style={[styles.statsCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>TOTAL WORKED</Text>
                <Text style={[styles.statValue, { color: "#10b981" }]}>
                  {workedMs !== null ? formatShortDuration(workedMs) : "—"}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>BREAK TIME</Text>
                <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                  {formatShortDuration(totalBreakMs)}
                </Text>
              </View>
            </View>

            {session.notes && (
              <View style={styles.notesSection}>
                <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 8 }]}>NOTES</Text>
                <View style={[styles.notesBox, { borderLeftColor: colors.primary + '40' }]}>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>"{session.notes}"</Text>
                </View>
              </View>
            )}

            <View style={styles.breaksSection}>
              <View style={styles.sectionHeader}>
                <Coffee size={14} color={colors.mutedForeground} />
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  BREAK SESSIONS ({breaks.length})
                </Text>
              </View>

              <View style={styles.breakList}>
                {breaks.map((brk: any, idx: number) => {
                  const duration = brk.break_end 
                    ? new Date(brk.break_end).getTime() - new Date(brk.break_start).getTime() 
                    : null;

                  return (
                    <View key={idx} style={[styles.breakItem, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <View style={styles.breakTimes}>
                        <Text style={[styles.breakTime, { color: colors.foreground }]}>{formatTime(brk.break_start)}</Text>
                        <ArrowRight size={12} color={colors.mutedForeground} style={{ marginHorizontal: 6 }} />
                        <Text style={[styles.breakTime, { color: colors.foreground }]}>
                          {brk.break_end ? formatTime(brk.break_end) : "Active"}
                        </Text>
                      </View>
                      <View style={[styles.breakBadge, { backgroundColor: "#f59e0b15" }]}>
                        <Text style={styles.breakBadgeText}>
                          {duration !== null ? formatShortDuration(duration) : "..."}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {breaks.length === 0 && (
                  <View style={[styles.emptyBreaks, { borderColor: colors.border, backgroundColor: colors.muted + '20' }]}>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No breaks recorded in this session
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.deleteButton, { backgroundColor: colors.destructive + '15' }]} 
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? <ActivityIndicator size="small" color={colors.destructive} /> : <Trash2 size={20} color={colors.destructive} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: colors.foreground, flex: 1 }]} 
                onPress={() => onEdit(session)}
                activeOpacity={0.8}
                disabled={deleting}
              >
                <Pencil size={18} color={colors.background} />
                <Text style={[styles.editButtonText, { color: colors.background }]}>Edit Session</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  timeColumn: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 10,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  notesSection: {
    marginBottom: 28,
  },
  notesBox: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingVertical: 4,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  breaksSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  breakList: {
    gap: 12,
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  breakTimes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakTime: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  breakBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  breakBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
  },
  emptyBreaks: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  editButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
