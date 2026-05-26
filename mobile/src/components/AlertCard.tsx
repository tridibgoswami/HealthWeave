import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Alert {
  id: string;
  title: string;
  summary: string;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  category?: string;
  detailed_explanation?: string;
  recommended_actions?: string[];
  consult_specialist?: string;
  medical_disclaimer?: string;
}

interface Props {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

const RISK = {
  low:      { bg: Colors.riskLowBg,      border: Colors.riskLowBorder,      text: Colors.riskLow,      icon: 'checkmark-circle' as const },
  moderate: { bg: Colors.riskModerateBg, border: Colors.riskModerateBorder, text: Colors.riskModerate, icon: 'alert-circle' as const },
  high:     { bg: Colors.riskHighBg,     border: Colors.riskHighBorder,     text: Colors.riskHigh,     icon: 'warning' as const },
  critical: { bg: Colors.riskCriticalBg, border: Colors.riskCriticalBorder, text: Colors.riskCritical, icon: 'medical' as const },
};

export function AlertCard({ alert, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK[alert.risk_level] || RISK.moderate;

  return (
    <View style={[styles.card, { backgroundColor: risk.bg, borderColor: risk.border }]}>
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <Ionicons name={risk.icon} size={18} color={risk.text} />
          <View style={[styles.badge, { backgroundColor: risk.text }]}>
            <Text style={styles.badgeText}>{alert.risk_level.toUpperCase()} RISK</Text>
          </View>
          {alert.category && (
            <Text style={[styles.category, { color: risk.text }]}>{alert.category}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.iconBtn}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16} color={risk.text}
            />
          </TouchableOpacity>
          {onDismiss && (
            <TouchableOpacity onPress={() => onDismiss(alert.id)} style={styles.iconBtn}>
              <Ionicons name="close" size={16} color={risk.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.title, { color: risk.text }]}>{alert.title}</Text>
      <Text style={[styles.summary, { color: risk.text, opacity: 0.8 }]}>{alert.summary}</Text>

      {expanded && (
        <View style={styles.expanded}>
          {alert.detailed_explanation && (
            <Text style={[styles.detail, { color: risk.text }]}>
              {alert.detailed_explanation}
            </Text>
          )}
          {alert.recommended_actions && alert.recommended_actions.length > 0 && (
            <View style={styles.actionsBlock}>
              <Text style={[styles.actionsTitle, { color: risk.text }]}>Recommended Actions</Text>
              {alert.recommended_actions.map((action, i) => (
                <View key={i} style={styles.actionItem}>
                  <View style={[styles.dot, { backgroundColor: risk.text }]} />
                  <Text style={[styles.actionText, { color: risk.text }]}>{action}</Text>
                </View>
              ))}
            </View>
          )}
          {alert.consult_specialist && (
            <Text style={[styles.consult, { color: risk.text }]}>
              Consult: {alert.consult_specialist}
            </Text>
          )}
          {alert.medical_disclaimer && (
            <Text style={[styles.disclaimer, { color: risk.text }]}>
              {alert.medical_disclaimer}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing.base, marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xs,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  badge: {
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  category: { fontSize: Typography.xs, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 28, height: 28, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: Typography.base, fontWeight: '700', marginBottom: 2 },
  summary: { fontSize: Typography.sm, lineHeight: 19 },
  expanded: {
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', gap: Spacing.sm,
  },
  detail: { fontSize: Typography.sm, lineHeight: 20 },
  actionsBlock: { gap: Spacing.xs },
  actionsTitle: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  actionText: { fontSize: Typography.sm, flex: 1, lineHeight: 18 },
  consult: { fontSize: Typography.sm, fontWeight: '600' },
  disclaimer: { fontSize: 11, opacity: 0.6, lineHeight: 16 },
});
