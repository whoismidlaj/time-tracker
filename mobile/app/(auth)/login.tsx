import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, SafeAreaView, Image,
} from 'react-native';
import { Clock, Mail, Lock, ChevronRight } from 'lucide-react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Configure Google Sign-In — replace with your actual Web Client ID from Google Cloud Console
GoogleSignin.configure({
  // This is the WEB Client ID (not the Android one)
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        setError('Failed to get Google token. Please try again.');
        return;
      }

      // Send the idToken to our backend for verification
      const response = await api.post('/mobile/auth/google', { idToken });
      const { token, user } = response.data;

      if (token) {
        await signIn(token, user);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled, no error needed
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available on this device.');
      } else {
        setError(err.response?.data?.error || 'Google sign-in failed.');
        console.error('Google Sign-In error:', err);
      }
    } finally {
      setGoogleLoading(false);
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
          {/* Header / Logo */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary + '15' }]}>
              <Clock size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Time Tracker</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Track your work hours seamlessly
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <View style={styles.googleButtonContent}>
                {/* Google G logo */}
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
                  Continue with Google
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or sign in with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email / Password Form */}
          <View style={styles.form}>
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
              style={[styles.button, { backgroundColor: colors.foreground, opacity: loading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Sign in</Text>
                  <ChevronRight size={18} color={colors.background} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Synced with your Time Tracker web account
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GOOGLE_BLUE = '#4285F4';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 36 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  errorContainer: {
    padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1,
  },
  errorText: { fontSize: 14, textAlign: 'center', fontWeight: '600' },
  googleButton: {
    height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleIcon: {
    width: 24, height: 24, borderRadius: 4,
    backgroundColor: GOOGLE_BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  googleIconText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  googleButtonText: { fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '600' },
  button: {
    height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 13, fontWeight: '500' },
});
