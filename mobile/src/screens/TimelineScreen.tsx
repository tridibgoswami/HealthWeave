import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timelineApi } from '../api/endpoints';
import { SkeletonCard } from '../components/Skeleton';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'lab_report', label: 'Lab' },
  { key: 'prescription', label: 'Rx' },
  { key: 'scan', label: 'Scan' },
  { key: 'consultation', label: 'Visit' },
];

const TYPE_COLORS: Record<string, { icon: string; color: string; bg: string }> = {
  lab_report:    { icon: 'flask',            color: '#0066FF', bg: '#EBF3FF' },
  prescription:  { icon: 'medical',          color: '#7C3AED', bg: '#F3F0FF' },
  scan:          { icon: 'body',             color: '#00C48C', bg: '#E6FBF4' },
  consultation:  { icon: 'person',           color: '#F59E0B', bg: '#FEF9E7' },
  vaccination:   { icon: 'shield-checkmark', color: '#EF4444', bg: '#FEF2F2' },
  discharge:     { icon: 'document-text',    color: '#0891B2', bg: '#E0F7FA' },
  other:         { icon: 'attach',           color: '#64748B', bg: '#F1F5F9' },
};

export function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['timeline', filter],
    queryFn: () => timelineApi.get({ limit: 50, event_type: filter || undefined }),
    staleTime: 3 * 60 * 1000,
  });

  const events = data?.data?.events || [];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const typeInfo = TYPE_COLORS[item.record_type || item.event_type] || TYPE_COLORS.other;
    const isLast = index === events.length - 1;

    return (
      <View style={styles.timelineItem}>
        {/* Line */}
        <View style={styles.lineCol}>
          <View style={[styles.dot, { backgroundColor: typeInfo.color }]} />
          {!isLast && <View style={styles.line} />}
        </View>

        {/* Card */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg }]}>
              <Ionicons name={typeInfo.icon as any} size={16} color={typeInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDate}>
                {item.event_date
                  ? new Date(item.event_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : 'Date unknown'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
          </View>

          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {/* Biomarkers preview */}
          {item.metadata?.biomarkers?.length > 0 && (
            <View style={styles.biomarkers}>
              {item.metadata.biomarkers.slice(0, 3).map((b: any, i: number) => (
                <View key={i} style={styles.bioChip}>
                  <Text style={styles.bioName}>{b.name}</Text>
                  <Text style={[styles.bioValue, {
                    color: b.is_abnormal ? Colors.danger : Colors.success,
                  }]}>
                    {b.value} {b.unit}
                  </Text>
                </View>
              ))}
              {item.metadata.biomarkers.length > 3 && (
                <View style={[styles.bioChip, { backgroundColor: Colors.bg }]}>
                  <Text style={[styles.bioName, { color: Colors.textTertiary }]}>
                    +{item.metadata.biomarkers.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: typeInfo.bg }]}>
              <Text style={[styles.tagText, { color: typeInfo.color }]}>
                {(item.record_type || item.event_type || 'record').replace('_', ' ')}
              </Text>
            </View>
            {item.facility_name && (
              <View style={styles.tag}>
                <Ionicons name="business-outline" size={10} color={Colors.textTertiary} />
                <Text style={styles.tagText}>{item.facility_name}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={['#00C48C', '#0066FF']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>Health Timeline</Text>
        <Text style={styles.headerSub}>{events.length} records in your history</Text>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing.base }}>
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🗒️</Text>
          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.emptyDesc}>Upload your first document to start building your health timeline</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item.event_id || Math.random().toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 24, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  filters: {
    flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },

  list: { padding: Spacing.base, paddingBottom: 100 },

  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  lineCol: { alignItems: 'center', width: 24, paddingTop: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },

  card: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.xl, padding: Spacing.base,
    marginLeft: Spacing.sm, marginBottom: Spacing.sm, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  typeIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  cardDate: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 1 },
  cardDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },

  biomarkers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  bioChip: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: Colors.bg, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  bioName: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  bioValue: { fontSize: 11, fontWeight: '700' },

  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.bg, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary, textTransform: 'capitalize' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
