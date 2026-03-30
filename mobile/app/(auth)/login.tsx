import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { Clock, Mail, Lock, LogIn, ChevronRight } from 'lucide-react-native';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { colors, theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mobile/login', { email, password });
      const { token, user } = response.data;

      if (token) {
        await signIn(token, user);
      } else {
        setError('Invalid login response');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary + '15' }]}>
              <Clock size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>TimeTrack</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your Personal OS for productivity
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.destructive + '15' }]}>
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Mail size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.mutedForeground + '80'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>PASSWORD</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Lock size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground + '80'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.foreground }]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Sign in to Dashboard</Text>
                  <ChevronRight size={18} color={colors.background} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Integrated with TimeTrack Web
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
