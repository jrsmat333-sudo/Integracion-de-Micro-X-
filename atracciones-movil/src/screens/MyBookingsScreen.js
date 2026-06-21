import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, RefreshControl, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { getMisReservas, cancelBooking } from '../services/api';
import SkeletonLoader from '../components/SkeletonLoader';

export default function MyBookingsScreen() {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await getMisReservas();
      setBookings(res?.data || res || []);
    } catch (err) {
      console.log('Error fetching bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (bookingId) => {
    Alert.alert(
      "Cancelar Reserva",
      "¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí, cancelar", 
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              fetchBookings();
            } catch (err) {
              Alert.alert("Error", "No se pudo cancelar la reserva.");
            }
          }
        }
      ]
    );
  };

  const handleContinuePayment = (item) => {
    const idempotencyKey = Crypto.randomUUID();
    navigation.navigate('Payment', { booking: item, idempotencyKey });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Pending': return { backgroundColor: '#FEF3C7', color: '#92400E', text: 'Pendiente' };
      case 'Confirmed': return { backgroundColor: '#D1FAE5', color: '#065F46', text: 'Confirmada' };
      case 'Completed': return { backgroundColor: '#DBEAFE', color: '#1E40AF', text: 'Completada' };
      case 'Cancelled': return { backgroundColor: '#FEE2E2', color: '#991B1B', text: 'Cancelada' };
      default: return { backgroundColor: colors.light, color: colors.charcoal, text: status };
    }
  };

  const renderBooking = ({ item }) => {
    const statusObj = getStatusStyles(item.status);
    const dateStr = item.activityDate ? new Date(item.activityDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.attractionName} numberOfLines={1}>{item.attractionName}</Text>
          <View style={[styles.badge, { backgroundColor: statusObj.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: statusObj.color }]}>{statusObj.text}</Text>
          </View>
        </View>

        <Text style={styles.pnrCode}>Código: {item.pnrCode}</Text>
        <Text style={styles.date}>{dateStr}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.totalAmount}>${item.totalAmount.toFixed(2)} {item.currency}</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {item.status === 'Pending' && (
              <TouchableOpacity style={styles.continuePayBtn} onPress={() => handleContinuePayment(item)}>
                <Text style={styles.continuePayText}>Continuar Pago</Text>
              </TouchableOpacity>
            )}
            {(item.status === 'Confirmed' || item.status === 'Pending') && (
              <TouchableOpacity onPress={() => handleCancel(item.bookingId)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.padding}>
      <SkeletonLoader width="100%" height={120} style={{ marginBottom: 16 }} />
      <SkeletonLoader width="100%" height={120} style={{ marginBottom: 16 }} />
      <SkeletonLoader width="100%" height={120} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.sand} />
      <Text style={styles.emptyTitle}>No tienes reservas</Text>
      <Text style={styles.emptySubtitle}>Explora nuestras atracciones y realiza tu primera reserva</Text>
      <TouchableOpacity 
        style={styles.exploreBtn} 
        onPress={() => navigation.navigate('InicioTab')}
      >
        <Text style={styles.exploreBtnText}>Explorar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
      </View>

      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderBooking}
          contentContainerStyle={bookings.length === 0 ? styles.flex1 : styles.padding}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchBookings} colors={[colors.forest]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: { paddingVertical: 16, backgroundColor: colors.cream, alignItems: 'center' },
  headerTitle: { fontFamily: typography.heading, fontSize: 28, color: colors.charcoal },
  padding: { padding: 16 },
  flex1: { flex: 1 },
  card: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  attractionName: { fontFamily: typography.bodySemiBold, fontSize: 16, color: colors.charcoal, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: typography.bodyMedium, fontSize: 12, textTransform: 'uppercase' },
  pnrCode: { fontFamily: typography.body, fontSize: 13, color: colors.sand, marginBottom: 4 },
  date: { fontFamily: typography.body, fontSize: 14, color: colors.charcoal, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.light, paddingTop: 12 },
  totalAmount: { fontFamily: typography.bodySemiBold, fontSize: 16, color: colors.charcoal },
  cancelText: {
    fontFamily: typography.bodyMedium,
    color: colors.status.cancelled,
    fontSize: 14,
  },
  continuePayBtn: {
    backgroundColor: colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  continuePayText: {
    fontFamily: typography.bodySemiBold,
    color: colors.white,
    fontSize: 13,
  },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontFamily: typography.heading, fontSize: 24, color: colors.charcoal, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontFamily: typography.body, fontSize: 15, color: colors.sand, textAlign: 'center', marginBottom: 24 },
  exploreBtn: { backgroundColor: colors.forest, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  exploreBtnText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 16 }
});
