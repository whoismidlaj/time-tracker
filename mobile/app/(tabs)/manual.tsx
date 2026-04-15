import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Save, X, ArrowLeft } from 'lucide-react-native';
import api from '../../lib/api';

export default function ManualEntryScreen() {
  const [punchIn, setPunchIn] = useState('');
  const [punchOut, setPunchOut] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!punchIn || !punchOut) {
      Alert.alert('Error', 'Please enter both punch in and punch out times.');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const fullIn = `${today}T${punchIn}:00`;
      const fullOut = `${today}T${punchOut}:00`;

      await api.post('/session/manual', {
        punch_in_time: fullIn,
        punch_out_time: fullOut,
        notes
      });

      Alert.alert('Success', 'Session saved successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color="#111" />
            </TouchableOpacity>
            <Text style={styles.title}>Manual Entry</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PUNCH IN TIME</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00"
              value={punchIn}
              onChangeText={setPunchIn}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PUNCH OUT TIME</Text>
            <TextInput
              style={styles.input}
              placeholder="18:30"
              value={punchOut}
              onChangeText={setPunchOut}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SESSION NOTES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What did you work on?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              <Save size={18} color="#fff" />
              <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Session'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    marginTop: 12,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#31C478',
    shadowColor: '#31C478',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9ca3af',
    fontSize: 12,
  },
});
