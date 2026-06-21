import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, TextInput, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { createPayment, updatePaymentStatus } from '../services/api';
import { startConnection, onPaymentApproved } from '../services/signalr';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking, idempotencyKey } = route.params;

  const [paymentMethod, setPaymentMethod] = useState('Crédito');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    startConnection();
  }, []);

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    setCardNumber(match ? match.join(' ') : cleaned);
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  const handlePay = async () => {
    if (!cardNumber || !cardName || !expiry || !cvc) {
      setError("Por favor completa los datos de la tarjeta.");
      return;
    }
    
    setError(null);
    setProcessing(true);

    try {
      const extId = `TXN-${Date.now()}`;
      const payload = {
        bookingId: booking.bookingId,
        paymentMethodId: 1, // 1=TC
        amount: booking.totalAmount,
        currencyCode: booking.currency,
        transactionExternalId: extId,
        statusId: 1 // Pending
      };

      const payRes = await createPayment(payload);
      const paymentId = payRes.data?.paymentId || payRes.paymentId;

      let paymentConfirmed = false;

      // Listen for SignalR
      onPaymentApproved((evt) => {
        if (evt.BookingId === booking.bookingId || evt.CorrelationId === idempotencyKey) {
          paymentConfirmed = true;
          finishPayment(paymentId, extId);
        }
      });

      // Timeout fallback (7 seconds)
      setTimeout(() => {
        if (!paymentConfirmed) {
          finishPayment(paymentId, extId);
        }
      }, 7000);

    } catch (err) {
      setError(err.message || "Error al procesar el pago");
      setProcessing(false);
    }
  };

  const finishPayment = async (paymentId, extId) => {
    try {
      await updatePaymentStatus(paymentId, {
        statusId: 2, // Approved
        transactionExternalId: extId,
        gatewayResponse: 'approved',
        correlationId: idempotencyKey
      });
      navigation.replace('BookingSuccess', { 
        booking, 
        paymentAmount: booking.totalAmount 
      });
    } catch (e) {
      setError("Pago procesado, pero hubo un error al actualizar el estado.");
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <View style={styles.processingContainer}>
        <Image 
          source={require('../../assets/images/gif-nekoarc.gif')} 
          style={styles.gif} 
          resizeMode="contain" 
        />
        <ActivityIndicator size="large" color={colors.white} style={{ marginVertical: 20 }} />
        <Text style={styles.processingText}>Verificando con el banco...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pago</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Reserva</Text>
          <Text style={styles.summaryPnr}>{booking.pnrCode}</Text>
          <Text style={styles.summaryAmount}>${booking.totalAmount.toFixed(2)} USD</Text>
        </View>

        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.methodsRow}>
          {['Crédito', 'Débito', 'Transferencia'].map(m => (
            <TouchableOpacity 
              key={m} 
              style={[styles.methodBtn, paymentMethod === m && styles.methodBtnSelected]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text style={[styles.methodText, paymentMethod === m && styles.methodTextSelected]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Datos de la Tarjeta</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            maxLength={19}
            value={cardNumber}
            onChangeText={formatCardNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre en la tarjeta"
            value={cardName}
            onChangeText={setCardName}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="MM/AA"
              keyboardType="numeric"
              maxLength={5}
              value={expiry}
              onChangeText={formatExpiry}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              placeholder="CVC"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={cvc}
              onChangeText={setCvc}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
          <Text style={styles.payBtnText}>Pagar ${booking.totalAmount.toFixed(2)} USD</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: typography.heading, fontSize: 20, color: colors.charcoal },
  closeBtn: { position: 'absolute', right: 16 },
  content: { padding: 20 },
  summaryCard: {
    backgroundColor: colors.light, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24
  },
  summaryLabel: { fontFamily: typography.label, color: colors.sand, marginBottom: 4 },
  summaryPnr: { fontFamily: typography.heading, fontSize: 28, color: colors.charcoal, marginBottom: 8 },
  summaryAmount: { fontFamily: typography.bodySemiBold, fontSize: 20, color: colors.forest },
  sectionTitle: { fontFamily: typography.heading, fontSize: 20, color: colors.charcoal, marginBottom: 16 },
  methodsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  methodBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.white
  },
  methodBtnSelected: { borderColor: colors.forest, backgroundColor: '#F0FDF4' },
  methodText: { fontFamily: typography.bodyMedium, color: colors.sand },
  methodTextSelected: { color: colors.forest },
  form: { gap: 16 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, backgroundColor: colors.white,
    fontFamily: typography.body, fontSize: 16, color: colors.charcoal
  },
  row: { flexDirection: 'row' },
  footer: { padding: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  payBtn: { backgroundColor: colors.forest, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 16 },
  errorText: { fontFamily: typography.bodyMedium, color: colors.status.cancelled, marginTop: 16, textAlign: 'center' },
  
  processingContainer: {
    flex: 1, backgroundColor: 'rgba(31, 30, 28, 0.95)', justifyContent: 'center', alignItems: 'center'
  },
  gif: { height: 120, width: 120 },
  processingText: { fontFamily: typography.bodyMedium, color: colors.sand, fontSize: 16 }
});
