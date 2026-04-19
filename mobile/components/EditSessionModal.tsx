import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, 
  TextInput, ActivityIndicator, Platform, Alert 
} from 'react-native';
import { X, Calendar, Clock, Save, Trash2, Coffee, Ban, Calculator, Plus } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { formatTime } from '../lib/utils';
import api from '../lib/api';

interface Break {
  id?: string | number;
  break_start: string;
  break_end: string | null;
  is_ignored: boolean;
}

interface Session {
  id: number | string;
  punch_in_time: string;
  punch_out_time: string | null;
  notes: string | null;
  breaks?: Break[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  session: Session | null;
  onRefresh: () => void;
}

export function EditSessionModal({ visible, onClose, session: initialSession, onRefresh }: Props) {
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [punchIn, setPunchIn] = useState<Date>(new Date());
  const [punchOut, setPunchOut] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [breaks, setBreaks] = useState<Break[]>([]);

  // Picker States
  const [showInPicker, setShowInPicker] = useState(false);
  const [showOutPicker, setShowOutPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (visible && initialSession) {
      setPunchIn(new Date(initialSession.punch_in_time));
      setPunchOut(initialSession.punch_out_time ? new Date(initialSession.punch_out_time) : null);
      setNotes(initialSession.notes || "");
      setBreaks(initialSession.breaks || []);
    } else if (visible) {
      setPunchIn(new Date());
      setPunchOut(null);
      setNotes("");
      setBreaks([]);
    }
  }, [visible, initialSession]);

  const handleSave = async () => {
    if (loading) return;
    
    // Validation
    if (punchOut && punchIn >= punchOut) {
      Alert.alert("Error", "Punch out must be after punch in");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        punch_in_time: punchIn.toISOString(),
        punch_out_time: punchOut?.toISOString() || null,
        notes,
        breaks: breaks.map(b => ({
          break_start: b.break_start,
          break_end: b.break_end,
          is_ignored: b.is_ignored
        }))
      };

      await api.patch(`/session/${initialSession?.id}`, payload);
      onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Save session error:', err);
      Alert.alert("Error", err.response?.data?.error || "Failed to save session");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/session/${initialSession?.id}`);
              onRefresh();
              onClose();
            } catch (err) {
              console.error('Delete error:', err);
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
    const now = new Date().toISOString();
    setBreaks([...breaks, { break_start: now, break_end: null, is_ignored: false }]);
  };

  const updateBreak = (index: number, field: keyof Break, value: any) => {
    const newBreaks = [...breaks];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    setBreaks(newBreaks);
  };

  const removeBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Clock size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Edit Session</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
              <X size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Input Times */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Timing</Text>
              
              <View style={styles.timeRow}>
                <TouchableOpacity 
                   style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                   onPress={() => { setPickerMode('date'); setShowInPicker(true); }}
                >
                  <Calendar size={14} color={colors.mutedForeground} />
                  <Text style={[styles.timeValue, { color: colors.foreground }]}>{format(punchIn, 'MMM do, yyyy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                   onPress={() => { setPickerMode('time'); setShowInPicker(true); }}
                >
                  <Clock size={14} color={colors.mutedForeground} />
                  <Text style={[styles.timeValue, { color: colors.foreground }]}>{format(punchIn, 'hh:mm a')}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.timeRow, { marginTop: 12 }]}>
                <TouchableOpacity 
                   style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                   onPress={() => { setPickerMode('date'); setShowOutPicker(true); }}
                >
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>OUT DATE</Text>
                  <Text style={[styles.timeValue, { color: punchOut ? colors.foreground : colors.mutedForeground + '60' }]}>
                    {punchOut ? format(punchOut, 'MMM do, yyyy') : 'Set end date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                   onPress={() => { setPickerMode('time'); setShowOutPicker(true); }}
                >
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>OUT TIME</Text>
                  <Text style={[styles.timeValue, { color: punchOut ? colors.foreground : colors.mutedForeground + '60' }]}>
                    {punchOut ? format(punchOut, 'hh:mm a') : 'Set end time'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {!punchOut && (
                 <TouchableOpacity onPress={() => setPunchOut(new Date())} style={styles.setNowBtn}>
                   <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>END SESSION NOW</Text>
                 </TouchableOpacity>
              )}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Session Notes</Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="What did you work on?"
                placeholderTextColor={colors.mutedForeground + '60'}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Breaks */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Breaks</Text>
                <TouchableOpacity onPress={addBreak} style={styles.addBreakBtn}>
                  <Plus size={12} color={colors.primary} />
                  <Text style={[styles.addBreakText, { color: colors.primary }]}>Add Break</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.breakList}>
                {breaks.map((b, i) => (
                  <View key={i} style={[styles.breakCard, { backgroundColor: colors.card, borderColor: b.is_ignored ? '#f59e0b40' : colors.border }]}>
                    <View style={styles.breakTimes}>
                      <View style={styles.breakTimeCol}>
                         <Text style={styles.breakTimeLabel}>START</Text>
                         <TextInput
                            style={[styles.breakTimeInput, { color: colors.foreground }]}
                            value={format(new Date(b.break_start), 'HH:mm')}
                            onChangeText={(val) => {
                               try {
                                 const d = new Date(b.break_start);
                                 const [h, m] = val.split(':');
                                 d.setHours(parseInt(h));
                                 d.setMinutes(parseInt(m));
                                 updateBreak(i, 'break_start', d.toISOString());
                               } catch(e) {}
                            }}
                         />
                      </View>
                      <View style={styles.breakTimeCol}>
                         <Text style={styles.breakTimeLabel}>END</Text>
                         <TextInput
                            style={[styles.breakTimeInput, { color: b.break_end ? colors.foreground : colors.mutedForeground + '40' }]}
                            placeholder="--:--"
                            value={b.break_end ? format(new Date(b.break_end), 'HH:mm') : ""}
                            onChangeText={(val) => {
                               try {
                                 const d = b.break_end ? new Date(b.break_end) : new Date(b.break_start);
                                 const [h, m] = val.split(':');
                                 d.setHours(parseInt(h));
                                 d.setMinutes(parseInt(m));
                                 updateBreak(i, 'break_end', d.toISOString());
                               } catch(e) {}
                            }}
                         />
                      </View>
                    </View>
                    
                    <View style={styles.breakActions}>
                       <TouchableOpacity 
                          onPress={() => updateBreak(i, 'is_ignored', !b.is_ignored)}
                          style={[styles.breakIconBtn, b.is_ignored && { backgroundColor: '#f59e0b20' }]}
                       >
                         {b.is_ignored ? <Ban size={14} color="#f59e0b" /> : <Calculator size={14} color={colors.mutedForeground} />}
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => removeBreak(i)} style={styles.breakIconBtn}>
                         <Trash2 size={14} color={colors.destructive} />
                       </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {breaks.length === 0 && (
                   <Text style={[styles.emptyBreaks, { color: colors.mutedForeground }]}>No breaks recorded</Text>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={handleDelete} 
              style={[styles.deleteBtn, { backgroundColor: colors.destructive + '15' }]}
              disabled={loading || deleting}
            >
              {deleting ? <ActivityIndicator size="small" color={colors.destructive} /> : <Trash2 size={20} color={colors.destructive} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.saveBtn, { backgroundColor: colors.foreground }]}
              disabled={loading || deleting}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Save size={18} color={colors.background} />
                  <Text style={[styles.saveBtnText, { color: colors.background }]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showInPicker && (
        <DateTimePicker
          value={punchIn}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowInPicker(false);
            if (date) setPunchIn(date);
          }}
        />
      )}

      {showOutPicker && (
        <DateTimePicker
          value={punchOut || new Date()}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowOutPicker(false);
            if (date) setPunchOut(date);
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    height: '92%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 1,
    padding: 24,
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
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: '800',
    opacity: 0.6,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  setNowBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    padding: 4,
  },
  notesInput: {
    minHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: 14,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  addBreakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  addBreakText: {
    fontSize: 10,
    fontWeight: '800',
  },
  breakList: {
    gap: 10,
  },
  breakCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakTimes: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  breakTimeCol: {
    gap: 2,
  },
  breakTimeLabel: {
    fontSize: 7,
    fontWeight: '800',
    opacity: 0.4,
  },
  breakTimeInput: {
    fontSize: 15,
    fontWeight: '800',
    padding: 0,
    minWidth: 50,
  },
  breakActions: {
    flexDirection: 'row',
    gap: 4,
  },
  breakIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBreaks: {
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  deleteBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
  }
});
