import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { useNavigation, useRoute } from '@react-navigation/native';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { GET_ATTRACTION_DETAIL } from '../services/graphql';
import { useAuth } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');

export default function AttractionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { slug } = route.params;
  const { isAuthenticated } = useAuth();

  const { data, loading, error } = useQuery(GET_ATTRACTION_DETAIL, {
    variables: { slug },
    fetchPolicy: 'network-only',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SkeletonLoader width="100%" height={300} borderRadius={0} />
        <View style={styles.padding}>
          <SkeletonLoader width={200} height={32} style={{ marginVertical: 16 }} />
          <SkeletonLoader width="100%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="80%" height={20} style={{ marginBottom: 24 }} />
          <SkeletonLoader width="100%" height={100} style={{ marginBottom: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data?.attraction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Error al cargar la atracción.</Text>
          <TouchableOpacity style={styles.backButtonInline} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const attr = data.attraction;
  const imageUrl = attr.imageUrl || 'https://via.placeholder.com/600x400';

  const handleReserve = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth');
    } else {
      navigation.navigate('BookingFlow', { attraction: attr });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        <View style={styles.heroSection}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.charcoal} />
          </TouchableOpacity>

          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>{attr.name}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.sand} />
            <Text style={styles.locationText}>{attr.locationName}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{attr.ratingAverage?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.ratingCount}>({attr.ratingCount} reseñas)</Text>
          </View>

          <View style={styles.chipsRow}>
            {attr.difficultyLevel && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{attr.difficultyLevel}</Text>
              </View>
            )}
            {attr.minAge !== null && attr.minAge !== undefined && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>+{attr.minAge} años</Text>
              </View>
            )}
            {attr.maxGroupSize !== null && attr.maxGroupSize !== undefined && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Máx {attr.maxGroupSize} pax</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Acerca de</Text>
          <Text style={styles.descriptionText}>
            {attr.descriptionFull || attr.descriptionShort || 'Sin descripción disponible.'}
          </Text>

          {(attr.address || attr.meetingPoint) && (
            <View style={styles.locationDetails}>
              {attr.address && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📍</Text>
                  <Text style={styles.detailText}>{attr.address}</Text>
                </View>
              )}
              {attr.meetingPoint && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🏁</Text>
                  <Text style={styles.detailText}>Punto de encuentro: {attr.meetingPoint}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Modalidades</Text>
          {attr.products && attr.products.length > 0 ? (
            attr.products.map(product => (
              <View key={product.id} style={styles.productCard}>
                <Text style={styles.productTitle}>{product.title}</Text>
                {product.description && (
                  <Text style={styles.productDescription}>{product.description}</Text>
                )}
                {product.durationMinutes && (
                  <Text style={styles.productDuration}>
                    <Ionicons name="time-outline" size={14} /> {product.durationMinutes} minutos
                  </Text>
                )}
                <View style={styles.priceTiersContainer}>
                  {product.priceTiers && product.priceTiers.map(tier => (
                    <View key={tier.id} style={styles.tierRow}>
                      <Text style={styles.tierName}>{tier.categoryName}</Text>
                      <Text style={styles.tierPrice}>${tier.price.toFixed(2)} {tier.currencyCode}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay modalidades configuradas.</Text>
          )}

        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.reserveButton} onPress={handleReserve}>
          <Text style={styles.reserveButtonText}>Reservar ahora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  padding: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.charcoal,
    marginBottom: 16,
  },
  backButtonInline: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: typography.bodyMedium,
    color: colors.charcoal,
  },
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom bar
  },
  heroSection: {
    position: 'relative',
    height: 300,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 30, 28, 0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroTitle: {
    fontFamily: typography.heading,
    fontSize: 32,
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  infoSection: {
    padding: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: colors.sand,
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  star: {
    color: colors.amber,
    fontSize: 16,
    marginRight: 4,
  },
  rating: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.charcoal,
    marginRight: 6,
  },
  ratingCount: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.sand,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: colors.charcoal,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    fontSize: 24,
    color: colors.charcoal,
    marginBottom: 12,
  },
  descriptionText: {
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.charcoal,
    marginBottom: 16,
  },
  locationDetails: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  detailText: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  productCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  productTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: 18,
    color: colors.charcoal,
    marginBottom: 4,
  },
  productDescription: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.sand,
    marginBottom: 8,
  },
  productDuration: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.charcoal,
    marginBottom: 12,
  },
  priceTiersContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 12,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tierName: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  tierPrice: {
    fontFamily: typography.bodySemiBold,
    fontSize: 15,
    color: colors.forest,
  },
  emptyText: {
    fontFamily: typography.body,
    color: colors.sand,
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  reserveButton: {
    backgroundColor: colors.forest,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontFamily: typography.bodySemiBold,
    color: colors.white,
    fontSize: 16,
    letterSpacing: 0.5,
  }
});
