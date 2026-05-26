import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { emergencyApi, familyApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/Card';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [showQR, setShowQR] = useState(false);

  const firstName = user?.profile?.first_name || 'User';
  const lastName  = user?.profile?.last_name  || '';
  const initials  = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const { data: passportData } = useQuery({
    queryKey: ['emergency-passport'],
    queryFn: () => emergencyApi.getPassport(),
    retry: false,
  });

  const { data: familyData } = useQuery({
    queryKey: ['family'],
    queryFn: () => familyApi.list(),
    retry: false,
  });

  const passport = passportData?.data;
  const family   = familyData?.data || [];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const MENU_SECTIONS = [
    {
      title: 'Health Profile',
      items: [
        { icon: 'person-outline',          label: 'Personal Information',   color: Colors.primary },
        { icon: 'medical-outline',         label: 'Medical Conditions',     color: Colors.purple },
        { icon: 'alert-circle-outline',    label: 'Allergies',              color: Colors.danger },
        { icon: 'fitness-outline',         label: 'Medications',            color: Colors.warning },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        { icon: 'download-outline',        label: 'Export My Data',         color: Colors.success },
        { icon: 'shield-checkmark-outline',label: 'Privacy Settings',       color: Colors.primary },
        { icon: 'trash-outline',           label: 'Delete Account',         color: Colors.danger },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'notifications-outline',   label: 'Notifications',          color: Colors.warning },
        { icon: 'help-circle-outline',     label: 'Help & Support',         color: Colors.textSecondary },
        { icon: 'information-circle-outline', label: 'About HealthWeave',   color: Colors.primary },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{firstName} {lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.profile?.blood_group && (
          <View style={styles.bloodGroup}>
            <Text style={styles.bloodGroupText}>🩸 {user.profile.blood_group}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.body}>
        {/* Emergency Passport */}
        <Card style={{ ...styles.emergencyCard, borderColor: Colors.danger }}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="medkit" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Passport</Text>
              <Text style={styles.emergencySub}>
                {passport ? 'QR code ready for first responders' : 'Set up your emergency profile'}
              </Text>
            </View>
            {passport && (
              <TouchableOpacity
                onPress={() => setShowQR(!showQR)}
                style={styles.qrToggle}
              >
                <Ionicons
                  name={showQR ? 'eye-off' : 'qr-code'}
                  size={20} color={Colors.danger}
                />
              </TouchableOpacity>
            )}
          </View>

          {showQR && passport?.qr_token && (
            <View style={styles.qrContainer}>
              <QRCode
                value={`https://app.healthweave.in/emergency/${passport.qr_token}`}
                size={180}
                backgroundColor="#fff"
                color="#0F172A"
              />
              <Text style={styles.qrLabel}>Show to first responders</Text>

              {/* Critical info preview */}
              <View style={styles.criticalInfo}>
                {passport.blood_group && (
                  <View style={styles.infoChip}>
                    <Text style={styles.infoLabel}>Blood</Text>
                    <Text style={styles.infoValue}>{passport.blood_group}</Text>
                  </View>
                )}
                {passport.allergies?.length > 0 && (
                  <View style={[styles.infoChip, { borderColor: Colors.dangerLight }]}>
                    <Text style={styles.infoLabel}>Allergies</Text>
                    <Text style={[styles.infoValue, { color: Colors.danger }]}>
                      {passport.allergies.slice(0, 2).join(', ')}
                    </Text>
                  </View>
                )}
                {passport.do_not_resuscitate && (
                  <View style={[styles.infoChip, { backgroundColor: Colors.dangerLight, borderColor: Colors.riskCriticalBorder }]}>
                    <Text style={[styles.infoValue, { color: Colors.danger }]}>DNR</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {!passport && (
            <TouchableOpacity style={styles.setupBtn}>
              <Ionicons name="add-circle" size={16} color={Colors.danger} />
              <Text style={styles.setupBtnText}>Set Up Emergency Profile</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Family Members */}
        {family.length > 0 && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Family Members ({family.length})</Text>
            </View>
            <View style={styles.familyList}>
              {family.map((member: any) => (
                <View key={member.id} style={styles.familyItem}>
                  <View style={[styles.familyAvatar, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={{ fontSize: 16 }}>
                      {member.relation === 'child' ? '👶' :
                       member.relation === 'parent' ? '👴' :
                       member.relation === 'spouse' ? '💑' : '👤'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.familyName}>
                      {member.first_name} {member.last_name}
                    </Text>
                    <Text style={styles.familyRelation}>
                      {member.relation}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addFamily}>
                <Ionicons name="person-add" size={16} color={Colors.primary} />
                <Text style={styles.addFamilyText}>Add Family Member</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section) => (
          <Card key={section.title}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < section.items.length - 1 && styles.menuBorder]}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        ))}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HealthWeave v1.0.0 · © 2026</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingBottom: 32, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.base, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: Typography.xl, fontWeight: '800', color: '#fff' },
  email: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  bloodGroup: {
    marginTop: Spacing.sm, backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  bloodGroupText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },

  body: { padding: Spacing.base, gap: Spacing.base },

  emergencyCard: { borderWidth: 1.5 },
  emergencyHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: Spacing.sm },
  emergencyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center',
  },
  emergencyTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  emergencySub: { fontSize: Typography.xs, color: Colors.textSecondary },
  qrToggle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.dangerLight, justifyContent: 'center', alignItems: 'center',
  },
  qrContainer: { alignItems: 'center', paddingVertical: Spacing.base, gap: Spacing.sm },
  qrLabel: { fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  criticalInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  infoChip: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  infoLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  setupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', paddingVertical: Spacing.sm,
  },
  setupBtnText: { fontSize: Typography.sm, color: Colors.danger, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.base },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  familyList: { gap: Spacing.sm },
  familyItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  familyAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  familyName: { fontSize: Typography.base, fontWeight: '600', color: Colors.text },
  familyRelation: { fontSize: Typography.xs, color: Colors.textTertiary, textTransform: 'capitalize' },
  addFamily: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4,
  },
  addFamilyText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },

  menuSectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: Typography.base, color: Colors.text },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.dangerLight, borderRadius: Radius.xl,
    paddingVertical: Spacing.base, borderWidth: 1, borderColor: Colors.riskCriticalBorder,
  },
  logoutText: { fontSize: Typography.base, color: Colors.danger, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textTertiary, paddingVertical: Spacing.sm },
});
