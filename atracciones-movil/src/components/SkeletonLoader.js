import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function SkeletonLoader({ width, height, borderRadius = 4, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function AttractionCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width="100%" height={180} borderRadius={0} />
      <View style={styles.content}>
        <SkeletonLoader width={100} height={14} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="80%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 16 }} />
        <View style={styles.footer}>
          <SkeletonLoader width={40} height={16} />
          <SkeletonLoader width={80} height={20} />
        </View>
      </View>
    </View>
  );
}

export function AttractionGridSkeleton() {
  return (
    <View>
      <AttractionCardSkeleton />
      <AttractionCardSkeleton />
      <AttractionCardSkeleton />
      <AttractionCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
});
