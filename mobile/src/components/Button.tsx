import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Shadow } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  title, onPress, variant = 'primary', loading = false,
  disabled = false, style, textStyle, icon, size = 'md',
}: Props) {
  const isDisabled = disabled || loading;

  const heights: Record<string, number> = { sm: 40, md: 52, lg: 58 };
  const fontSizes: Record<string, number> = { sm: 13, md: 15, lg: 17 };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress} disabled={isDisabled}
        style={[{ opacity: isDisabled ? 0.6 : 1 }, style]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#0066FF', '#0052CC']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.base, { height: heights[size], borderRadius: Radius.lg }, Shadow.lg]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon}
              <Text style={[styles.primaryText, { fontSize: fontSizes[size] }, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles: Record<Variant, ViewStyle> = {
    primary: {},
    secondary: { backgroundColor: Colors.primaryLight },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  };

  const textColors: Record<Variant, string> = {
    primary: '#fff',
    secondary: Colors.primary,
    outline: Colors.primary,
    ghost: Colors.primary,
    danger: Colors.danger,
  };

  return (
    <TouchableOpacity
      onPress={onPress} disabled={isDisabled} activeOpacity={0.75}
      style={[
        styles.base, variantStyles[variant],
        { height: heights[size], borderRadius: Radius.lg, opacity: isDisabled ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColors[variant], fontSize: fontSizes[size] }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingHorizontal: 20,
  },
  text: { fontWeight: '600' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
