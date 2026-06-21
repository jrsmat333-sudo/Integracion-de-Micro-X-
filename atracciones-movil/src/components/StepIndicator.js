import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.stepWrapper}>
            <View style={styles.stepTop}>
              <View 
                style={[
                  styles.circle,
                  isActive && styles.circleActive,
                  isCompleted && styles.circleCompleted
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text style={[
                    styles.circleText,
                    (isActive || isCompleted) && styles.circleTextActive
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {!isLast && (
                <View style={[
                  styles.line,
                  isCompleted && styles.lineCompleted
                ]} />
              )}
            </View>
            
            <Text style={[
              styles.label,
              isActive && styles.labelActive,
              isCompleted && styles.labelCompleted
            ]}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  circleActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  circleCompleted: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  circleText: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: colors.sand,
  },
  circleTextActive: {
    color: colors.white,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginLeft: -2,
    marginRight: -10, // overlap next wrapper
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: colors.forest,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 10,
    color: colors.sand,
    marginTop: 6,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.charcoal,
    fontFamily: typography.bodySemiBold,
  },
  labelCompleted: {
    color: colors.charcoal,
  }
});
