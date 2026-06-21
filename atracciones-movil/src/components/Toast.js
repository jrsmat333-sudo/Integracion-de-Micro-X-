import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const toastRef = React.createRef();

export function ToastProvider() {
  return <Toast ref={toastRef} />;
}

ToastProvider.show = (options) => {
  if (toastRef.current) {
    toastRef.current.show(options);
  }
};

const Toast = forwardRef((props, ref) => {
  const [config, setConfig] = useState(null);
  const translateY = new Animated.Value(-100);
  const opacity = new Animated.Value(0);
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => ({
    show: (options) => {
      setConfig(options);
      
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 10,
          useNativeDriver: true,
          bounciness: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      setTimeout(() => {
        hide();
      }, options.duration || 3500);
    }
  }));

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setConfig(null);
    });
  };

  if (!config) return null;

  const isSuccess = config.type === 'success';
  const bgColor = isSuccess ? colors.forest : colors.charcoal;
  const icon = isSuccess ? 'checkmark-circle' : 'close-circle';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: bgColor,
          transform: [{ translateY }],
          opacity
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
      <Text style={styles.message}>{config.message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: colors.white,
    marginLeft: 12,
    flex: 1,
  }
});

export default ToastProvider;
