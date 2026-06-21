import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import colors from '../theme/colors';
import typography from '../theme/typography';

export default function BookingSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking, paymentAmount } = route.params;

  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark" size={60} color={colors.white} />
        </Animated.View>
        
        <Text style={styles.title}>¡Reserva Confirmada!</Text>
        <Text style={styles.subtitle}>Tu experiencia está asegurada</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Código de Reserva (PNR)</Text>
          <Text style={styles.pnrCode}>{booking.pnrCode}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>Total Pagado</Text>
            <Text style={styles.amount}>${paymentAmount.toFixed(2)} USD</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Confirmada</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          >
            <Text style={styles.primaryBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.ghostBtn} 
            onPress={() => navigation.reset({ 
              index: 0, 
              routes: [
                { 
                  name: 'MainTabs', 
                  state: { routes: [{ name: 'BookingsTab' }] } 
                }
              ] 
            })}
          >
            <Text style={styles.ghostBtnText}>Ver mis reservas</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.forest,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: colors.forest, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8
  },
  title: { fontFamily: typography.heading, fontSize: 32, color: colors.charcoal, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: typography.body, fontSize: 16, color: colors.sand, marginBottom: 32, textAlign: 'center' },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '100%',
    borderWidth: 1, borderColor: colors.border, marginBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4
  },
  label: { fontFamily: typography.label, color: colors.sand, marginBottom: 4 },
  pnrCode: { fontFamily: typography.heading, fontSize: 36, color: colors.charcoal, textAlign: 'center', letterSpacing: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amount: { fontFamily: typography.bodySemiBold, fontSize: 18, color: colors.charcoal },
  badge: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontFamily: typography.bodyMedium, fontSize: 12, color: '#065F46', textTransform: 'uppercase' },
  buttonContainer: { width: '100%', gap: 16 },
  primaryBtn: { backgroundColor: colors.forest, borderRadius: 8, paddingVertical: 16, alignItems: 'center', width: '100%' },
  primaryBtnText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 16 },
  ghostBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 16, alignItems: 'center', width: '100%', backgroundColor: colors.white },
  ghostBtnText: { fontFamily: typography.bodyMedium, color: colors.charcoal, fontSize: 16 },
});
