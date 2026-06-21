import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, RefreshControl, TextInput, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { getClientById, updateClient, getMyInvoices } from '../services/api';
import SkeletonLoader from '../components/SkeletonLoader';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  
  const [clientData, setClientData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, invoicesRes] = await Promise.all([
        getClientById(user.id),
        getMyInvoices()
      ]);
      setClientData(clientRes);
      setEditForm(clientRes);
      setInvoices(invoicesRes?.data || invoicesRes || []);
    } catch (err) {
      console.log('Error fetching profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClient(user.id, editForm);
      setClientData(editForm);
      setIsEditing(false);
      Alert.alert("Éxito", "Perfil actualizado correctamente");
    } catch (err) {
      Alert.alert("Error", "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, salir", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        }
      ]
    );
  };

  const generateInvoicePDF = async (invoice) => {
    try {
      const dateStr = new Date(invoice.issuedAt).toLocaleDateString('es-ES');
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1F1E1C; }
              .header { text-align: center; margin-bottom: 40px; }
              .header h1 { color: #2B3E2F; margin: 0; font-size: 36px; }
              .info { display: flex; justify-content: space-between; margin-bottom: 40px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #E8E4DF; }
              th { background-color: #F2EDE8; color: #A89886; font-size: 12px; text-transform: uppercase; }
              .totals { text-align: right; }
              .totals p { margin: 5px 0; }
              .totals .total { font-size: 20px; font-weight: bold; color: #2B3E2F; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>COMINCA</h1>
              <p>Factura de venta</p>
            </div>
            <div class="info">
              <div>
                <strong>Cliente:</strong> ${invoice.customerName}<br>
                <strong>RUC/CI:</strong> ${invoice.taxId}<br>
                <strong>Email:</strong> ${invoice.email || ''}<br>
                <strong>Dirección:</strong> ${invoice.address || ''}
              </div>
              <div style="text-align: right;">
                <strong>Factura #:</strong> ${invoice.invoiceNumber}<br>
                <strong>Fecha:</strong> ${dateStr}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Reserva ${invoice.bookingId} - ${invoice.description || 'Servicios turísticos'}</td>
                  <td style="text-align: right;">$${(invoice.totalAmount / 1.15).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="totals">
              <p>Subtotal: $${(invoice.totalAmount / 1.15).toFixed(2)}</p>
              <p>IVA (15%): $${(invoice.totalAmount - (invoice.totalAmount / 1.15)).toFixed(2)}</p>
              <p class="total">Total: $${invoice.totalAmount.toFixed(2)} ${invoice.currency}</p>
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert("Error", "No se pudo generar el PDF");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
        </View>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <SkeletonLoader width={80} height={80} borderRadius={40} />
          <SkeletonLoader width={150} height={24} style={{ marginTop: 16 }} />
          <SkeletonLoader width={200} height={16} style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : 'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} colors={[colors.forest]} />}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Datos Personales</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color={colors.forest} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={editForm.firstName} onChangeText={t => setEditForm({...editForm, firstName: t})} />
              <Text style={styles.label}>Apellido</Text>
              <TextInput style={styles.input} value={editForm.lastName} onChangeText={t => setEditForm({...editForm, lastName: t})} />
              <Text style={styles.label}>Teléfono</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" value={editForm.phoneNumber} onChangeText={t => setEditForm({...editForm, phoneNumber: t})} />
              <Text style={styles.label}>Documento</Text>
              <TextInput style={styles.input} value={editForm.documentNumber} onChangeText={t => setEditForm({...editForm, documentNumber: t})} />
              
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => { setIsEditing(false); setEditForm(clientData); }}>
                  <Text style={styles.ghostBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.primaryBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Nombre</Text>
                <Text style={styles.value}>{clientData?.firstName || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Apellido</Text>
                <Text style={styles.value}>{clientData?.lastName || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{clientData?.email || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Teléfono</Text>
                <Text style={[styles.value, !clientData?.phoneNumber && styles.italic]}>
                  {clientData?.phoneNumber || 'No registrado'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Documento</Text>
                <Text style={styles.value}>
                  {clientData?.documentNumber ? `${clientData.documentType || ''} ${clientData.documentNumber}` : '-'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Mis Facturas</Text>
        {invoices.length === 0 ? (
          <Text style={styles.emptyText}>No tienes facturas disponibles.</Text>
        ) : (
          invoices.map((inv, idx) => (
            <View key={idx} style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceNumber}>#{inv.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{new Date(inv.createdAt || inv.issuedAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.invoiceCustomer}>{inv.customerName}</Text>
              <View style={styles.invoiceFooter}>
                <Text style={styles.invoiceTotal}>${(inv.total || inv.totalAmount || 0).toFixed(2)} {inv.currency}</Text>
                <TouchableOpacity style={styles.pdfBtn} onPress={() => generateInvoicePDF(inv)}>
                  <Ionicons name="document-text-outline" size={16} color={colors.forest} />
                  <Text style={styles.pdfBtnText}>Ver PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  header: { paddingVertical: 16, alignItems: 'center' },
  headerTitle: { fontFamily: typography.heading, fontSize: 28, color: colors.charcoal },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.forest, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontFamily: typography.heading, fontSize: 32, color: colors.white },
  userName: { fontFamily: typography.heading, fontSize: 24, color: colors.charcoal },
  userEmail: { fontFamily: typography.body, fontSize: 14, color: colors.sand },
  
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 32 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontFamily: typography.bodySemiBold, fontSize: 18, color: colors.charcoal },
  
  infoList: { gap: 12 },
  infoRow: { marginBottom: 4 },
  label: { fontFamily: typography.label, fontSize: 11, color: colors.sand, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontFamily: typography.body, fontSize: 15, color: colors.charcoal },
  italic: { fontStyle: 'italic', color: colors.sand },
  
  form: { gap: 12 },
  input: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, fontSize: 15, fontFamily: typography.body, color: colors.charcoal, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryBtn: { flex: 1, backgroundColor: colors.forest, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 14 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontFamily: typography.bodyMedium, color: colors.charcoal, fontSize: 14 },

  sectionTitle: { fontFamily: typography.heading, fontSize: 22, color: colors.charcoal, marginBottom: 16 },
  emptyText: { fontFamily: typography.body, color: colors.sand, fontStyle: 'italic', marginBottom: 24 },
  
  invoiceCard: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  invoiceNumber: { fontFamily: typography.bodySemiBold, fontSize: 15, color: colors.charcoal },
  invoiceDate: { fontFamily: typography.body, fontSize: 13, color: colors.sand },
  invoiceCustomer: { fontFamily: typography.body, fontSize: 14, color: colors.charcoal, marginBottom: 12 },
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.light, paddingTop: 12 },
  invoiceTotal: { fontFamily: typography.heading, fontSize: 20, color: colors.forest },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pdfBtnText: { fontFamily: typography.bodyMedium, fontSize: 13, color: colors.forest, marginLeft: 4 },
  
  logoutBtn: { marginTop: 32, paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  logoutBtnText: { fontFamily: typography.bodySemiBold, fontSize: 16, color: colors.status.cancelled }
});
