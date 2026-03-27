import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Save, X } from 'lucide-react-native';
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
      // Basic validation and ISO formatting
      // In a real app, use a DateTime picker
      const today = new Date().toISOString().split('T')[0];
      const fullIn = `${today}T${punchIn}:00`;
      const fullOut = `${today}T${punchOut}:00`;

      await api.post('/session', {
        action: 'manual_entry',
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
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Punch In Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="09:00"
          value={punchIn}
          onChangeText={setPunchIn}
        />

        <Text style={styles.label}>Punch Out Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="17:00"
          value={punchOut}
          onChangeText={setPunchOut}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What did you work on?"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Session</Text>
          </TouchableOpacity>
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
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#111',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#000',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
