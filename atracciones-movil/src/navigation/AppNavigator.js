import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

// We will create these screen files next
import HomeScreen from '../screens/HomeScreen';
import AttractionDetailScreen from '../screens/AttractionDetailScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';
import PaymentScreen from '../screens/PaymentScreen';
import BookingSuccessScreen from '../screens/BookingSuccessScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="AttractionDetail" component={AttractionDetailScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.sand,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: typography.bodyMedium,
          fontSize: 12,
        }
      }}
    >
      <Tab.Screen 
        name="InicioTab" 
        component={HomeStackScreen} 
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="BookingsTab" 
        component={isAuthenticated ? MyBookingsScreen : AuthScreen} 
        options={{
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={isAuthenticated ? ProfileScreen : AuthScreen} 
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen} 
          options={{ presentation: 'modal' }} 
        />
        <Stack.Screen 
          name="BookingFlow" 
          component={BookingFlowScreen} 
          options={{ presentation: 'modal' }} 
        />
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen} 
          options={{ presentation: 'modal', gestureEnabled: false }} 
        />
        <Stack.Screen 
          name="BookingSuccess" 
          component={BookingSuccessScreen} 
          options={{ presentation: 'modal', gestureEnabled: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
