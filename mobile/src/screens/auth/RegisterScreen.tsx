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

export function RegisterScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParams>>();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill all required fields.'); return;
    }
    if (form.password !== form.confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.'); return;
    }
    if (form.password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.'); return;
    }
    setLoading(true);
    try {
      await register({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone || undefined,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  const Field = ({
    label, field, placeholder, keyboard = 'default', secure = false, autoComplete,
  }: {
    label: string; field: keyof typeof form; placeholder: string;
    keyboard?: any; secure?: boolean; autoComplete?: any;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={form[field]} onChangeText={set(field)}
          keyboardType={keyboard}
          secureTextEntry={secure && !showPass}
          autoCapitalize={field === 'email' ? 'none' : 'words'}
          autoComplete={autoComplete}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Ionicons
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={18} color={Colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#0066FF', '#0052CC']} style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.headerSub}>Start your health journey</Text>
      </LinearGradient>

      <ScrollView
        style={styles.form} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="First Name *" field="first_name" placeholder="Tridib" autoComplete="given-name" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last Name *" field="last_name" placeholder="Goswami" autoComplete="family-name" />
          </View>
        </View>

        <Field label="Email address *" field="email" placeholder="you@example.com"
          keyboard="email-address" autoComplete="email" />
        <Field label="Phone number" field="phone" placeholder="+91 9876543210"
          keyboard="phone-pad" autoComplete="tel" />
        <Field label="Password *" field="password" placeholder="Min. 8 characters" secure autoComplete="new-password" />
        <Field label="Confirm Password *" field="confirm" placeholder="Repeat password" secure />

        <View style={styles.terms}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={styles.termsText}>
            By registering, you agree to our Privacy Policy. Your health data is encrypted
            end-to-end and never sold to third parties.
          </Text>
        </View>

        <Button
          title="Create Account" onPress={handleRegister}
          loading={loading} style={{ marginTop: Spacing.lg }}
        />

        <TouchableOpacity style={styles.switchRow} onPress={() => nav.navigate('Login')}>
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl,
  },
  backBtn: { marginBottom: Spacing.base },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { flex: 1, backgroundColor: Colors.bg },
  row: { flexDirection: 'row', gap: Spacing.sm },
  field: { marginBottom: Spacing.base },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, height: 52,
  },
  input: { flex: 1, fontSize: Typography.base, color: Colors.text },
  terms: {
    flexDirection: 'row', gap: 8, marginTop: Spacing.sm,
    backgroundColor: Colors.successLight, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'flex-start',
  },
  termsText: { fontSize: Typography.xs, color: Colors.success, flex: 1, lineHeight: 18 },
  switchRow: { marginTop: Spacing.lg, alignItems: 'center' },
  switchText: { fontSize: Typography.base, color: Colors.textSecondary },
});
