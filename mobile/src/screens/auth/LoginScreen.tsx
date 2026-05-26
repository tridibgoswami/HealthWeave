import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParams } from '../../navigation/types';

export function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParams>>();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.'); return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#0066FF', '#0052CC', '#003D99']} style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 28 }}>🧬</Text>
          </View>
          <Text style={styles.logoText}>HealthWeave</Text>
        </View>
        <Text style={styles.tagline}>Your lifelong health memory</Text>
      </LinearGradient>

      <ScrollView
        style={styles.form} contentContainerStyle={{ padding: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your health profile</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
              autoComplete="email" textContentType="emailAddress"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={Colors.textTertiary}
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPass}
              textContentType="password" autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={18} color={Colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title="Sign In" onPress={handleLogin}
          loading={loading} style={{ marginTop: Spacing.lg }}
        />

        <TouchableOpacity style={styles.switchRow} onPress={() => nav.navigate('Register')}>
          <Text style={styles.switchText}>
            Don't have an account?{' '}
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Create one</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            Your health data is encrypted and never shared without your consent.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 80, paddingBottom: 40, paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logoIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff' },
  tagline: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { flex: 1, backgroundColor: Colors.bg },
  title: {
    fontSize: Typography['3xl'], fontWeight: '800',
    color: Colors.text, marginBottom: 4,
  },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.sm, fontWeight: '600',
    color: Colors.text, marginBottom: Spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, height: 52,
  },
  input: {
    flex: 1, fontSize: Typography.base, color: Colors.text,
  },
  switchRow: { marginTop: Spacing.lg, alignItems: 'center' },
  switchText: { fontSize: Typography.base, color: Colors.textSecondary },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: Spacing.xl, paddingTop: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  disclaimerText: { fontSize: Typography.xs, color: Colors.textTertiary, flex: 1, lineHeight: 18 },
});
