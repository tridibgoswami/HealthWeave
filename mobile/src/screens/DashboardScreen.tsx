import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { intelligenceApi, timelineApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { HealthScoreRing } from '../components/HealthScoreRing';
import { AlertCard } from '../components/AlertCard';
import { Card } from '../components/Card';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import type { MainTabsParams } from '../navigation/types';

const { width } = Dimensions.get('window');

const SCORE_KEYS = [
  { key: 'heart_score',       label: 'Heart' },
  { key: 'liver_score',       label: 'Liver' },
  { key: 'kidney_score',      label: 'Kidney' },
  { key: 'metabolic_score',   label: 'Metabolic' },
  { key: 'inflammation_score',label: 'Inflam.' },
  { key: 'preventive_score',  label: 'Preventive' },
  { key: 'thyroid_score',     label: 'Thyroid' },
  { key: 'blood_score',       label: 'Blood' },
];

const QUICK_ACTIONS = [
  { icon: 'cloud-upload-outline', label: 'Upload', tab: 'Upload', color: '#0066FF', bg: '#EBF3FF' },
  { icon: 'chatbubbles-outline',  label: 'AI Chat', tab: 'Chat',   color: '#7C3AED', bg: '#F3F0FF' },
  { icon: 'time-outline',         label: 'Timeline', tab: 'Timeline', color: '#00C48C', bg: '#E6FBF4' },
  { icon: 'medical-outline',      label: 'Emergency', tab: 'Profile', color: '#EF4444', bg: '#FEF2F2' },
] as const;

export function DashboardScreen() {
  const nav = useNavigation<BottomTabNavigationProp<MainTabsParams>>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.profile?.first_name || 'there';

  const [refreshing, setRefreshing] = React.useState(false);

  const { data: scoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ['health-scores'],
    queryFn: () => intelligenceApi.getHealthScores(1),
    staleTime: 10 * 60 * 1000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => timelineApi.get({ limit: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const scores = scoresData?.data?.scores?.[0] || {};
  const alerts = (alertsData?.data || []).slice(0, 3);
  const events = timelineData?.data?.events || [];
  const overall = Math.round(scores.overall_score || 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#0066FF', '#0052CC', '#003D99']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overall score hero */}
        <View style={styles.scoreHero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Overall Health Score</Text>
            {scoresLoading ? (
              <Skeleton height={48} width={80} borderRadius={8} />
            ) : (
              <Text style={styles.heroScore}>{overall || '—'}</Text>
            )}
            {scores.ai_narrative && (
              <Text style={styles.heroNarrative} numberOfLines={2}>
                {scores.ai_narrative}
              </Text>
            )}
          </View>
          {!scoresLoading && overall > 0 && (
            <HealthScoreRing score={overall} size={96} strokeWidth={9} showLabel={false} />
          )}
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionBtn, { backgroundColor: action.bg }]}
              onPress={() => nav.navigate(action.tab as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={20} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Health Score Grid */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Organ Health Scores</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Details</Text>
            </TouchableOpacity>
          </View>
          {scoresLoading ? (
            <View style={styles.scoresGrid}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.scoreItem}>
                  <Skeleton height={70} width={70} borderRadius={35} />
                  <Skeleton height={10} width={55} style={{ marginTop: 6 }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.scoresGrid}>
              {SCORE_KEYS.map(({ key, label }) => {
                const val = scores[key.replace('_score', '')] ?? scores[key];
                return (
                  <View key={key} style={styles.scoreItem}>
                    <HealthScoreRing
                      score={val ?? 0} size={68} strokeWidth={7} label={label}
                    />
                  </View>
                );
              })}
            </View>
          )}
          {scores.ai_narrative && (
            <View style={styles.narrativeBox}>
              <Ionicons name="sparkles" size={14} color={Colors.primary} />
              <Text style={styles.narrativeText}>{scores.ai_narrative}</Text>
            </View>
          )}
        </Card>

        {/* Active Alerts */}
        {(alertsLoading || alerts.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.alertsTitle}>
                <Ionicons name="notifications" size={16} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Health Alerts</Text>
                {alerts.length > 0 && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{alerts.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => nav.navigate('Alerts')}>
                <Text style={styles.seeAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {alertsLoading ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : (
              alerts.map((alert: any) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </View>
        )}

        {/* Recent Timeline */}
        {events.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Records</Text>
              <TouchableOpacity onPress={() => nav.navigate('Timeline')}>
                <Text style={styles.seeAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {events.slice(0, 3).map((ev: any, i: number) => (
              <View key={ev.id || i} style={[styles.timelineItem, i > 0 && styles.timelineBorder]}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTitle}>{ev.title}</Text>
                  <Text style={styles.timelineDate}>
                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-IN') : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
              </View>
            ))}
          </Card>
        )}

        {/* Empty state */}
        {!scoresLoading && !overall && (
          <Card style={{ ...styles.section, ...styles.emptyCard }}>
            <Text style={{ fontSize: 40 }}>🧬</Text>
            <Text style={styles.emptyTitle}>Your health journey starts here</Text>
            <Text style={styles.emptyDesc}>
              Upload your first lab report or prescription to unlock AI-powered insights about your health.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => nav.navigate('Upload')}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Upload First Record</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  name: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff', marginTop: 2 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: Typography.lg, fontWeight: '800', color: '#fff' },
  scoreHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: { flex: 1, paddingRight: Spacing.base },
  heroLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroScore: { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 58 },
  heroNarrative: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 16 },

  body: { padding: Spacing.base, gap: Spacing.base },

  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1, borderRadius: Radius.xl, paddingVertical: Spacing.base,
    alignItems: 'center', gap: Spacing.xs,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '700' },

  section: { padding: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  alertsTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  alertBadge: {
    backgroundColor: Colors.warning, borderRadius: Radius.full,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  alertBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  scoreItem: { width: (width - 96) / 4, alignItems: 'center' },

  narrativeBox: {
    flexDirection: 'row', gap: 8, marginTop: Spacing.base,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'flex-start',
  },
  narrativeText: { flex: 1, fontSize: Typography.xs, color: Colors.primary, lineHeight: 17 },

  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  timelineBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  timelineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  timelineTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  timelineDate: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 1 },

  emptyCard: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptyDesc: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  emptyBtn: {
    flexDirection: 'row', gap: 6, backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12,
    marginTop: Spacing.sm, alignItems: 'center',
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
});
