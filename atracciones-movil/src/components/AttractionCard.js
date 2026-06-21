import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';

export default function AttractionCard({ attraction, onPress }) {
  const imageUrl = attraction.imageUrl || 'https://via.placeholder.com/400x300';
  const price = attraction.startingPrice ? `$${attraction.startingPrice.toFixed(2)} ${attraction.currencyCode}` : 'N/A';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        {attraction.difficultyLevel && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{attraction.difficultyLevel}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={colors.sand} />
          <Text style={styles.locationText}>{attraction.locationName || 'Ecuador'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{attraction.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {attraction.descriptionShort || 'Sin descripción disponible'}
        </Text>
        <View style={styles.footer}>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{attraction.ratingAverage?.toFixed(1) || '0.0'}</Text>
          </View>
          <Text style={styles.priceLabel}>
            Desde <Text style={styles.price}>{price}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(31, 30, 28, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: typography.bodyMedium,
    fontSize: 10,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    padding: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.sand,
    marginLeft: 4,
  },
  name: {
    fontFamily: typography.heading,
    fontSize: 20,
    color: colors.charcoal,
    marginBottom: 4,
  },
  description: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.sand,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: colors.amber,
    fontSize: 14,
    marginRight: 4,
  },
  rating: {
    fontFamily: typography.bodySemiBold,
    fontSize: 14,
    color: colors.charcoal,
  },
  priceLabel: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.sand,
  },
  price: {
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    color: colors.forest,
  },
});
