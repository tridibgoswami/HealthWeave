import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { intelligenceApi } from '../api/endpoints';
import { AlertCard } from '../components/AlertCard';
import { SkeletonCard } from '../components/Skeleton';
import { Colors, Typography, Spacing, Radius } from '../theme';

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high',     label: 'High' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'low',      label: 'Low' },
];

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', showDismissed],
    queryFn: () => intelligenceApi.getAlerts(showDismissed),
    staleTime: 2 * 60 * 1000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => intelligenceApi.dismissAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const allAlerts: any[] = data?.data || [];
  const filtered = filter === 'all'
    ? allAlerts
    : allAlerts.filter((a) => a.risk_level === filter);
  const sorted = [...filtered].sort((a, b) =>
    (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4)
  );

  const criticalCount = allAlerts.filter((a) => a.risk_level === 'critical').length;
  const highCount     = allAlerts.filter((a) => a.risk_level === 'high').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={criticalCount > 0 ? ['#EF4444', '#F97316'] : ['#F59E0B', '#0066FF']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Health Alerts</Text>
            <Text style={styles.headerSub}>AI-generated preventive indicators</Text>
          </View>
          {criticalCount > 0 && (
            <View style={styles.criticalBadge}>
              <Ionicons name="warning" size={14} color="#fff" />
              <Text style={styles.criticalText}>{criticalCount} Critical</Text>
            </View>
          )}
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Critical', count: criticalCount, color: '#fff' },
            { label: 'High',     count: highCount,     color: 'rgba(255,255,255,0.8)' },
            { label: 'Total',    count: allAlerts.length, color: 'rgba(255,255,255,0.7)' },
          ].map((s) => (
            <View key={s.label} style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowDismissed(!showDismissed)}>
          <Text style={styles.toggleDismissed}>
            {showDismissed ? 'Active' : 'Dismissed'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing.base }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={styles.emptyTitle}>
            {showDismissed ? 'No dismissed alerts' : 'No active alerts'}
          </Text>
          <Text style={styles.emptyDesc}>
            {showDismissed
              ? 'You haven\'t dismissed any alerts yet.'
              : 'Your health looks stable! Upload more records to get AI insights.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onDismiss={!showDismissed ? (id) => dismiss.mutate(id) : undefined}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.warning} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 24, paddingHorizontal: Spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.base },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  criticalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  criticalText: { fontSize: Typography.sm, fontWeight: '800', color: '#fff' },
  summaryRow: {
    flexDirection: 'row', gap: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.lg, padding: Spacing.sm,
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryNum: { fontSize: Typography['2xl'], fontWeight: '900' },
  summaryLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  filtersRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filters: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  toggleDismissed: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  list: { padding: Spacing.base, paddingBottom: 100 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing['3xl'], gap: Spacing.sm,
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
