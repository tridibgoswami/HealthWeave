import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Typography } from '../theme';

interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showLabel?: boolean;
}

function scoreColor(score: number) {
  if (score >= 80) return ['#00C48C', '#00D4FF'];
  if (score >= 60) return ['#0066FF', '#00D4FF'];
  if (score >= 40) return ['#F59E0B', '#F97316'];
  return ['#EF4444', '#F97316'];
}

export function HealthScoreRing({
  score, size = 80, strokeWidth = 8, label, showLabel = true,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const [c1, c2] = scoreColor(score);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={`grad-${label}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={Colors.border} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
        />
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#grad-${label})`} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.score, { fontSize: size * 0.22, color: c1 }]}>
          {Math.round(score)}
        </Text>
      </View>
      {showLabel && label && (
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: {
    position: 'absolute', top: 0, left: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  score: { fontWeight: '800' },
  label: {
    marginTop: 4, fontSize: Typography.xs,
    color: Colors.textSecondary, fontWeight: '500',
    textAlign: 'center',
  },
});
