import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, Coffee, Save, Trash2, Calendar, Plus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { 
  formatInputDateTime, 
  parseLocalToUTC,
  formatTime
} from '../lib/utils';

interface EditSessionModalProps {
  session: any;
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function EditSessionModal({ session, visible, onClose, onRefresh }: EditSessionModalProps) {
  const { colors, theme } = useTheme();
  const [punchInDate, setPunchInDate] = useState('');
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutDate, setPunchOutDate] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Picker States
  const [activePicker, setActivePicker] = useState<{ type: 'in' | 'out' | 'breakIn' | 'breakOut' | 'dateIn' | 'dateOut', index?: number } | null>(null);

  useEffect(() => {
    if (visible) {
      if (session) {
        const inVals = formatInputDateTime(session.punch_in_time);
        setPunchInDate(inVals.date);
        setPunchInTime(inVals.time);
        
        if (session.punch_out_time) {
          const outVals = formatInputDateTime(session.punch_out_time);
          setPunchOutDate(outVals.date);
          setPunchOutTime(outVals.time);
        } else {
          setPunchOutDate('');
          setPunchOutTime('');
        }
        
        setNotes(session.notes || '');
        setBreaks((session.breaks || []).map((b: any) => {
          const bIn = formatInputDateTime(b.break_start);
          const bOut = b.break_end ? formatInputDateTime(b.break_end) : { time: '' };
          return {
            ...b,
            start_time: bIn.time,
            end_time: bOut.time
          };
        }));
      } else {
        const now = formatInputDateTime(new Date().toISOString());
        setPunchInDate(now.date);
        setPunchInTime(now.time);
        setPunchOutDate('');
        setPunchOutTime('');
        setNotes('');
        setBreaks([]);
      }
    }
  }, [visible, session]);

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (!selectedDate) return;

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (activePicker?.type === 'dateIn' || activePicker?.type === 'dateOut') {
      const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
      if (activePicker.type === 'dateIn') setPunchInDate(dateStr);
      else setPunchOutDate(dateStr);
    } else {
      const timeStr = `${pad(selectedDate.getHours())}:${pad(selectedDate.getMinutes())}`;
      if (activePicker?.type === 'in') setPunchInTime(timeStr);
      else if (activePicker?.type === 'out') setPunchOutTime(timeStr);
      else if (activePicker?.type === 'breakIn' && activePicker.index !== undefined) {
        const newBreaks = [...breaks];
        newBreaks[activePicker.index].start_time = timeStr;
        setBreaks(newBreaks);
      } else if (activePicker?.type === 'breakOut' && activePicker.index !== undefined) {
        const newBreaks = [...breaks];
        newBreaks[activePicker.index].end_time = timeStr;
        setBreaks(newBreaks);
      }
    }
  };

  const getPickerDate = (dateStr: string, timeStr: string) => {
    const [y, M, d] = (dateStr || '2024-01-01').split('-').map(Number);
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const date = new Date();
    date.setFullYear(y, M - 1, d);
    date.setHours(h, m, 0, 0);
    return date;
  };

  const displayTime = (timeStr: string) => {
    if (!timeStr) return 'Not set';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const inUTC = parseLocalToUTC(punchInDate, punchInTime);
      const outUTC = punchOutDate && punchOutTime ? parseLocalToUTC(punchOutDate, punchOutTime) : null;

      if (!inUTC) throw new Error("Punch-in time is required");

      const processedBreaks = breaks.map(b => ({
        break_start: parseLocalToUTC(punchInDate, b.start_time), // Using punch-in date as reference for breaks
        break_end: b.end_time ? parseLocalToUTC(punchInDate, b.end_time) : null
      }));

      const payload = {
        punch_in_time: inUTC,
        punch_out_time: outUTC,
        notes,
        breaks: processedBreaks,
        action: session ? undefined : 'manual_entry'
      };

      if (session) {
        await api.patch(`/session/${session.id}`, payload);
      } else {
        await api.post('/session', payload);
      }

      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || err.message || "Failed to save session");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to permanently delete this session and all its breaks?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/session/${session.id}`);
              if (onRefresh) onRefresh();
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

  const addBreak = () => {
    const lastTime = breaks.length > 0 ? (breaks[breaks.length - 1].end_time || punchInTime) : punchInTime;
    setBreaks([...breaks, { start_time: lastTime, end_time: '' }]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {session ? 'Edit Session' : 'Manual Entry'}
              </Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Punch In */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Clock size={12} color="#10b981" />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>PUNCH IN</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    onPress={() => setActivePicker({ type: 'dateIn' })}
                    style={[styles.pickerTrigger, { backgroundColor: colors.muted, flex: 1.5 }]}
                  >
                    <Calendar size={14} color={colors.primary} />
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{punchInDate || 'Date'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActivePicker({ type: 'in' })}
                    style={[styles.pickerTrigger, { backgroundColor: colors.muted, flex: 1 }]}
                  >
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{displayTime(punchInTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Punch Out */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Clock size={12} color="#ef4444" />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>PUNCH OUT</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity 
                    onPress={() => setActivePicker({ type: 'dateOut' })}
                    style={[styles.pickerTrigger, { backgroundColor: colors.muted, flex: 1.5 }]}
                  >
                    <Calendar size={14} color={colors.destructive} />
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{punchOutDate || 'Not set'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActivePicker({ type: 'out' })}
                    style={[styles.pickerTrigger, { backgroundColor: colors.muted, flex: 1 }]}
                  >
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{displayTime(punchOutTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 8 }]}>SESSION NOTES</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What did you work on?"
                  placeholderTextColor={colors.mutedForeground + '60'}
                  multiline
                />
              </View>

              {/* Breaks */}
              <View style={styles.breaksSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Coffee size={14} color={colors.mutedForeground} />
                    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BREAKS</Text>
                  </View>
                  <TouchableOpacity onPress={addBreak} style={[styles.addButton, { backgroundColor: colors.primary + '15' }]}>
                    <Plus size={14} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Break</Text>
                  </TouchableOpacity>
                </View>

                {breaks.map((brk, idx) => (
                  <View key={idx} style={[styles.breakRow, { backgroundColor: colors.muted + '40', borderColor: colors.border }]}>
                    <View style={styles.breakInputs}>
                      <View style={styles.breakInputCol}>
                        <Text style={[styles.breakInputLabel, { color: colors.mutedForeground }]}>START</Text>
                        <TouchableOpacity 
                          onPress={() => setActivePicker({ type: 'breakIn', index: idx })}
                          style={[styles.breakPicker, { backgroundColor: colors.card }]}
                        >
                          <Text style={[styles.breakPickerText, { color: colors.foreground }]}>{displayTime(brk.start_time)}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.breakInputCol}>
                        <Text style={[styles.breakInputLabel, { color: colors.mutedForeground }]}>END</Text>
                        <TouchableOpacity 
                          onPress={() => setActivePicker({ type: 'breakOut', index: idx })}
                          style={[styles.breakPicker, { backgroundColor: colors.card }]}
                        >
                          <Text style={[styles.breakPickerText, { color: colors.foreground }]}>{displayTime(brk.end_time)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setBreaks(breaks.filter((_, i) => i !== idx))} style={styles.trashIcon}>
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                {session && (
                  <TouchableOpacity 
                    style={[styles.deleteButton, { backgroundColor: colors.destructive + '15' }]} 
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? <ActivityIndicator size="small" color={colors.destructive} /> : <Trash2 size={20} color={colors.destructive} />}
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.foreground }]} 
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator size="small" color={colors.background} /> : (
                    <View style={styles.buttonContent}>
                      <Save size={18} color={colors.background} />
                      <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Session</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          
          {activePicker && (
            <DateTimePicker
              value={(() => {
                if (activePicker.type === 'dateIn') return getPickerDate(punchInDate, '00:00');
                if (activePicker.type === 'dateOut') return getPickerDate(punchOutDate || punchInDate, '00:00');
                if (activePicker.type === 'in') return getPickerDate(punchInDate, punchInTime);
                if (activePicker.type === 'out') return getPickerDate(punchOutDate || punchInDate, punchOutTime || punchInTime);
                if (activePicker.type === 'breakIn' && activePicker.index !== undefined) return getPickerDate(punchInDate, breaks[activePicker.index].start_time);
                if (activePicker.type === 'breakOut' && activePicker.index !== undefined) return getPickerDate(punchInDate, breaks[activePicker.index].end_time || breaks[activePicker.index].start_time);
                return new Date();
              })()}
              mode={(activePicker.type === 'dateIn' || activePicker.type === 'dateOut') ? 'date' : 'time'}
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickerChange}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
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
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerTrigger: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakPicker: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakPickerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  notesInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    fontWeight: '600',
  },
  breaksSection: {
    marginBottom: 32,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  breakInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  breakInputCol: {
    flex: 1,
    gap: 4,
  },
  breakInputLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginLeft: 2,
  },
  trashIcon: {
    padding: 10,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  deleteButton: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
  },
});
