import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  TextInput, Image, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function AuthScreen() {
  const navigation = useNavigation();
  const { login, register } = useAuth();
  
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.charcoal} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.title}>Bienvenido a Cominca</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, tab === 'login' && styles.activeTab]}
            onPress={() => { setTab('login'); setError(null); }}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.activeTabText]}>
              Iniciar Sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, tab === 'register' && styles.activeTab]}
            onPress={() => { setTab('register'); setError(null); }}
          >
            <Text style={[styles.tabText, tab === 'register' && styles.activeTabText]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {tab === 'register' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={colors.sand}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido"
                placeholderTextColor={colors.sand}
                value={lastName}
                onChangeText={setLastName}
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.sand}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              placeholderTextColor={colors.sand}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.sand} />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {loading ? (
            <View style={styles.loadingContainer}>
              <Image 
                source={require('../../assets/images/gif-nekoarc.gif')} 
                style={styles.gif} 
                resizeMode="contain" 
              />
              <ActivityIndicator size="small" color={colors.forest} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={tab === 'login' ? handleLogin : handleRegister}
            >
              <Text style={styles.submitBtnText}>
                {tab === 'login' ? 'Iniciar Sesión' : 'Crear cuenta'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  container: { flex: 1, padding: 24 },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logo: { height: 50, width: '100%', marginBottom: 16 },
  title: { fontFamily: typography.heading, fontSize: 28, color: colors.charcoal },
  tabContainer: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.forest },
  tabText: { fontFamily: typography.bodyMedium, fontSize: 16, color: colors.sand },
  activeTabText: { color: colors.charcoal, fontFamily: typography.bodySemiBold },
  formContainer: { gap: 16 },
  input: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 12, fontSize: 15, fontFamily: typography.body, color: colors.charcoal
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border
  },
  passwordInput: {
    flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: typography.body, color: colors.charcoal
  },
  submitBtn: {
    backgroundColor: colors.forest, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24
  },
  submitBtnText: { fontFamily: typography.bodySemiBold, color: colors.white, fontSize: 16 },
  errorText: { fontFamily: typography.bodyMedium, color: colors.status.cancelled, marginTop: 8 },
  loadingContainer: { alignItems: 'center', marginTop: 24 },
  gif: { height: 80, width: 80 }
});
