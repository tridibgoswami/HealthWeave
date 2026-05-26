import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'bordered' | 'flat';
  padding?: number;
}

export function Card({ children, style, variant = 'default', padding = Spacing.base }: Props) {
  const variantStyle: ViewStyle =
    variant === 'elevated' ? Shadow.md :
    variant === 'bordered' ? { borderWidth: 1, borderColor: Colors.border } :
    variant === 'flat'     ? { backgroundColor: Colors.surfaceSecondary } :
    Shadow.sm;

  return (
    <View style={[styles.card, variantStyle, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
  },
});
