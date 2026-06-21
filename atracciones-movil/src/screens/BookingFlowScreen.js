import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { createBookingV2 } from '../services/api';
import StepIndicator from '../components/StepIndicator';
import { useAuth } from '../context/AuthContext';

export default function BookingFlowScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { attraction } = route.params;
  const { user } = useAuth();

  const [step, setStep] = useState(0); // 0: Fecha/Hora, 1: Pasajeros, 2: Facturación
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 state
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 2 state
  const [passengers, setPassengers] = useState([]);

  // Step 3 state
  const [billing, setBilling] = useState({
    customerName: user?.name || '',
    taxId: '',
    email: user?.email || '',
    address: ''
  });

  // Derived data
  const selectedProduct = useMemo(() => 
    attraction.products?.find(p => p.id === selectedProductId),
  [attraction, selectedProductId]);

  const availableDates = useMemo(() => {
    if (!selectedProductId || !attraction.slots) return [];
    const slots = attraction.slots.filter(s => s.productOptionId === selectedProductId);
    
    // Group by fecha
    const grouped = {};
    slots.forEach(s => {
      if (!grouped[s.fecha]) grouped[s.fecha] = [];
      grouped[s.fecha].push(...s.horarios);
    });
    
    return Object.keys(grouped).sort().map(fecha => ({
      fecha,
      horarios: grouped[fecha]
    }));
  }, [attraction, selectedProductId]);

  const totalPrice = useMemo(() => {
    return passengers.reduce((sum, p) => sum + p.price, 0);
  }, [passengers]);

  // Handlers
  const handleAddPassenger = (tier) => {
    setPassengers([
      ...passengers,
      {
        id: Date.now().toString(),
        priceTierId: tier.id,
        categoryName: tier.categoryName,
        price: tier.price,
        firstName: '',
        lastName: '',
        documentType: 'CI',
        documentNumber: ''
      }
    ]);
  };

  const handleUpdatePassenger = (id, field, value) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePassenger = (id) => {
    setPassengers(passengers.filter(p => p.id !== id));
  };

  const validateStep2 = () => {
    if (passengers.length === 0) return false;
    for (const p of passengers) {
      if (!p.firstName.trim() || !p.lastName.trim() || !p.documentNumber.trim()) return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!billing.customerName || !billing.taxId || !billing.email || !billing.address) {
      setError("Todos los campos de facturación son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Generar Idempotency Key para la reserva
      const idempotencyKey = Crypto.randomUUID();
      
      const payload = {
        slotId: selectedSlot.slotId,
        attractionId: attraction.id,
        productOptionId: selectedProductId,
        contactName: billing.customerName,
        contactEmail: billing.email,
        tickets: passengers.map(p => ({
          priceTierId: p.priceTierId,
          passengerName: `${p.firstName} ${p.lastName}`,
          documentNumber: p.documentNumber,
          documentType: p.documentType,
          phoneNumber: "999999999" // placeholder if not collected
        })),
        billing: {
          customerName: billing.customerName,
          taxId: billing.taxId,
          email: billing.email,
          address: billing.address,
          phoneNumber: "999999999"
        }
      };

      const result = await createBookingV2(payload, idempotencyKey);
      
      navigation.navigate('Payment', { 
        booking: result.data, 
        attraction, 
        idempotencyKey 
      });
      
    } catch (err) {
      setError(err.message || "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  };

  // Render Steps
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>1. Selecciona Modalidad</Text>
      {attraction.products?.map(prod => (
        <TouchableOpacity
          key={prod.id}
          style={[styles.productCard, selectedProductId === prod.id && styles.productCardSelected]}
          onPress={() => {
            setSelectedProductId(prod.id);
            setSelectedSlot(null);
          }}
        >
          <View style={styles.productHeader}>
            <Text style={[styles.productTitle, selectedProductId === prod.id && styles.textSelected]}>
              {prod.title}
            </Text>
            {prod.priceTiers?.[0] && (
              <Text style={styles.productPrice}>Desde ${prod.priceTiers[0].price}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {selectedProductId && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>2. Fechas y Horarios</Text>
          {availableDates.length === 0 ? (
            <Text style={styles.emptyText}>No hay horarios disponibles para esta modalidad.</Text>
          ) : (
            availableDates.map(dateGroup => (
              <View key={dateGroup.fecha} style={styles.dateGroup}>
                <Text style={styles.dateTitle}>{new Date(dateGroup.fecha).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric'})}</Text>
                <View style={styles.slotsGrid}>
                  {dateGroup.horarios.map(slot => {
                    const isSelected = selectedSlot?.slotId === slot.slotId;
                    return (
                      <TouchableOpacity
                        key={slot.slotId}
                        style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text style={[styles.slotTime, isSelected && styles.textSelected]}>
                          {slot.horaInicio.substring(0,5)}
                        </Text>
                        <Text style={[styles.slotAvail, isSelected && styles.textSelected]}>
                          {slot.cuposDisponibles} cupos
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </>
      )}
      
      <TouchableOpacity 
        style={[styles.button, (!selectedProductId || !selectedSlot) && styles.buttonDisabled]}
        disabled={!selectedProductId || !selectedSlot}
        onPress={() => setStep(1)}
      >
        <Text style={styles.buttonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Añadir Pasajeros</Text>
      
      <View style={styles.addPassengerRow}>
        {selectedProduct?.priceTiers?.map(tier => (
          <TouchableOpacity 
            key={tier.id} 
            style={styles.addPassengerBtn}
            onPress={() => handleAddPassenger(tier)}
          >
            <Ionicons name="add" size={16} color={colors.charcoal} />
            <Text style={styles.addPassengerBtnText}>
              {tier.categoryName} (${tier.price})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {passengers.map((p, index) => (
        <View key={p.id} style={styles.passengerCard}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerTitle}>Pasajero {index + 1} ({p.categoryName})</Text>
            <TouchableOpacity onPress={() => handleRemovePassenger(p.id)}>
              <Ionicons name="close" size={20} color={colors.status.cancelled} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Nombre"
              value={p.firstName}
              onChangeText={(t) => handleUpdatePassenger(p.id, 'firstName', t)}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Apellido"
              value={p.lastName}
              onChangeText={(t) => handleUpdatePassenger(p.id, 'lastName', t)}
            />
          </View>

          <View style={styles.inputRow}>
            <TouchableOpacity 
              style={styles.docTypeBtn}
              onPress={() => handleUpdatePassenger(p.id, 'documentType', p.documentType === 'CI' ? 'PASAPORTE' : 'CI')}
            >
              <Text style={styles.docTypeText}>{p.documentType}</Text>
              <Ionicons name="swap-vertical" size={12} color={colors.sand} />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              placeholder={`Número de ${p.documentType}`}
              keyboardType={p.documentType === 'CI' ? 'numeric' : 'default'}
              value={p.documentNumber}
              onChangeText={(t) => handleUpdatePassenger(p.id, 'documentNumber', t)}
            />
          </View>
        </View>
      ))}

      <View style={styles.totalFooter}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>${totalPrice.toFixed(2)} USD</Text>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setStep(0)}>
          <Text style={styles.buttonGhostText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, !validateStep2() && styles.buttonDisabled, { flex: 1, marginLeft: 12 }]}
          disabled={!validateStep2()}
          onPress={() => setStep(2)}
        >
          <Text style={styles.buttonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Datos de Facturación</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre / Razón Social</Text>
        <TextInput
          style={styles.input}
          value={billing.customerName}
          onChangeText={(t) => setBilling({...billing, customerName: t})}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>RUC / Cédula</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={billing.taxId}
          onChangeText={(t) => setBilling({...billing, taxId: t})}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={billing.email}
          onChangeText={(t) => setBilling({...billing, email: t})}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={billing.address}
          onChangeText={(t) => setBilling({...billing, address: t})}
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Resumen</Text>
        <Text style={styles.summaryText}>{attraction.name}</Text>
        <Text style={styles.summaryText}>{selectedProduct?.title} - {selectedSlot?.horaInicio}</Text>
        <View style={styles.divider} />
        
        {passengers.map((p, i) => (
          <View key={i} style={styles.summaryRow}>
            <Text style={styles.summaryText}>{p.categoryName} ({p.firstName})</Text>
            <Text style={styles.summaryText}>${p.price.toFixed(2)}</Text>
          </View>
        ))}
        
        <View style={styles.divider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Subtotal</Text>
          <Text style={styles.summaryText}>${(totalPrice / 1.15).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>IVA (15%)</Text>
          <Text style={styles.summaryText}>${(totalPrice - (totalPrice / 1.15)).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>${totalPrice.toFixed(2)} USD</Text>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setStep(1)} disabled={loading}>
          <Text style={styles.buttonGhostText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, { flex: 1, marginLeft: 12 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Confirmar y pagar →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reservar {attraction.name}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <StepIndicator 
        steps={["Fecha y hora", "Pasajeros", "Facturación"]} 
        currentStep={step} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.heading,
    fontSize: 20,
    color: colors.charcoal,
    textAlign: 'center',
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContainer: { flex: 1 },
  sectionTitle: {
    fontFamily: typography.heading,
    fontSize: 22,
    color: colors.charcoal,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  productCardSelected: {
    borderColor: colors.forest,
    backgroundColor: '#F0FDF4', // Very light green
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.charcoal,
  },
  productPrice: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: colors.sand,
  },
  textSelected: { color: colors.forest },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  dateGroup: { marginBottom: 16 },
  dateTitle: { fontFamily: typography.bodySemiBold, fontSize: 14, color: colors.charcoal, marginBottom: 8, textTransform: 'capitalize' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    minWidth: 80,
  },
  slotChipSelected: {
    borderColor: colors.forest,
    backgroundColor: colors.forest,
  },
  slotTime: { fontFamily: typography.bodySemiBold, fontSize: 14, color: colors.charcoal },
  slotAvail: { fontFamily: typography.body, fontSize: 11, color: colors.sand, marginTop: 2 },
  emptyText: { fontFamily: typography.body, color: colors.sand, fontStyle: 'italic' },
  button: {
    backgroundColor: colors.forest,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 16 },
  buttonGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonGhostText: { fontFamily: typography.bodyMedium, color: colors.charcoal, fontSize: 16 },
  
  // Step 2
  addPassengerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  addPassengerBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.white
  },
  addPassengerBtnText: { fontFamily: typography.bodyMedium, fontSize: 13, color: colors.charcoal, marginLeft: 4 },
  passengerCard: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 16
  },
  passengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  passengerTitle: { fontFamily: typography.bodySemiBold, fontSize: 15, color: colors.charcoal },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
  input: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    fontFamily: typography.body, fontSize: 15, paddingVertical: 8, color: colors.charcoal
  },
  docTypeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: colors.border, width: 90, paddingVertical: 8
  },
  docTypeText: { fontFamily: typography.bodyMedium, fontSize: 13, color: colors.charcoal },
  totalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontFamily: typography.heading, fontSize: 24, color: colors.charcoal },
  totalValue: { fontFamily: typography.heading, fontSize: 24, color: colors.forest },
  navButtons: { flexDirection: 'row', justifyContent: 'space-between' },

  // Step 3
  formGroup: { marginBottom: 16 },
  label: { fontFamily: typography.label, fontSize: 12, color: colors.sand, marginBottom: 4 },
  summaryBox: {
    backgroundColor: colors.light, borderRadius: 12, padding: 16, marginTop: 12
  },
  summaryTitle: { fontFamily: typography.bodySemiBold, fontSize: 16, color: colors.charcoal, marginBottom: 12 },
  summaryText: { fontFamily: typography.body, fontSize: 14, color: colors.charcoal, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryTotalLabel: { fontFamily: typography.bodySemiBold, fontSize: 16, color: colors.charcoal },
  summaryTotalValue: { fontFamily: typography.bodySemiBold, fontSize: 18, color: colors.forest },
  errorText: { fontFamily: typography.bodyMedium, color: colors.status.cancelled, marginTop: 16, textAlign: 'center' }
});
