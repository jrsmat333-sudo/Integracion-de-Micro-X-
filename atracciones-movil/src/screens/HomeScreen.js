import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  FlatList, Image, Dimensions, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';

import colors from '../theme/colors';
import typography from '../theme/typography';
import { GET_ATTRACTIONS } from '../services/graphql';
import { getTopAttractions } from '../services/api';
import { startConnection, onAttractionCreated } from '../services/signalr';

import AttractionCard from '../components/AttractionCard';
import { AttractionGridSkeleton } from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');

const CAROUSEL_IMAGES = [
  require('../../assets/carousel/img1.jpg'),
  require('../../assets/carousel/img4.jpg'),
  require('../../assets/carousel/img5.jpg'),
  require('../../assets/carousel/imagen6.jpg'),
  require('../../assets/carousel/img7.jpg'),
  require('../../assets/carousel/img9.jpg'),
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [topAttractions, setTopAttractions] = useState([]);
  const carouselRef = useRef(null);

  const { data, loading, refetch } = useQuery(GET_ATTRACTIONS, {
    variables: { search: searchQuery, page: 1, pageSize: 20 },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    loadTopAttractions();

    // SignalR
    const setupSignalR = async () => {
      console.log('[SignalR] Iniciando conexión desde HomeScreen...');
      await startConnection();
      onAttractionCreated((data) => {
        console.log('[SignalR] 🚀 Evento OnAttractionCreated recibido!', data);
        refetch();
        loadTopAttractions();
      });
    };
    setupSignalR();

    // Carousel auto-scroll
    let slideIndex = 0;
    const interval = setInterval(() => {
      slideIndex = (slideIndex + 1) % CAROUSEL_IMAGES.length;
      if (carouselRef.current) {
        carouselRef.current.scrollToIndex({ index: slideIndex, animated: true });
        setActiveSlide(slideIndex);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const loadTopAttractions = async () => {
    try {
      const res = await getTopAttractions(5);
      if (res?.data) {
        setTopAttractions(res.data);
      }
    } catch (e) {
      console.log('Error loading top attractions', e);
    }
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
    setActiveSlide(slide);
  };

  const renderCarouselItem = ({ item }) => (
    <View style={styles.carouselItem}>
      <Image source={item} style={styles.carouselImage} resizeMode="cover" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.sand} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar atracciones..."
            placeholderTextColor={colors.sand}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={[colors.forest]} />
        }
      >
        {!searchQuery && (
          <View style={styles.heroSection}>
            <FlatList
              ref={carouselRef}
              data={CAROUSEL_IMAGES}
              renderItem={renderCarouselItem}
              keyExtractor={(_, i) => i.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
            />
            <View style={styles.pagination}>
              {CAROUSEL_IMAGES.map((_, i) => (
                <View 
                  key={i} 
                  style={[styles.dot, i === activeSlide && styles.activeDot]} 
                />
              ))}
            </View>
          </View>
        )}

        {!searchQuery && topAttractions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destinos Destacados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topAttractionsList}>
              {topAttractions.map(attr => (
                <View key={attr.id} style={styles.topAttractionWrapper}>
                  <AttractionCard 
                    attraction={attr} 
                    onPress={() => navigation.navigate('AttractionDetail', { slug: attr.slug })}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Explorar Atracciones</Text>
          <Text style={styles.sectionSubtitle}>Descubre experiencias únicas en Ecuador</Text>
          
          {loading ? (
            <AttractionGridSkeleton />
          ) : (
            <View style={styles.catalogGrid}>
              {data?.attractions?.map(attr => (
                <AttractionCard 
                  key={attr.id}
                  attraction={attr} 
                  onPress={() => navigation.navigate('AttractionDetail', { slug: attr.slug })}
                />
              ))}
              {data?.attractions?.length === 0 && (
                <Text style={styles.emptyText}>No se encontraron atracciones.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    height: 40,
    width: '100%',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.charcoal,
  },
  container: {
    flex: 1,
  },
  heroSection: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
  },
  carouselItem: {
    width: width - 32,
    height: 220,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.forest,
  },
  section: {
    marginTop: 24,
  },
  lastSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    fontSize: 24,
    color: colors.charcoal,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.sand,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  topAttractionsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topAttractionWrapper: {
    width: 260,
    marginRight: 16,
  },
  catalogGrid: {
    marginTop: 8,
  },
  emptyText: {
    fontFamily: typography.body,
    color: colors.sand,
    textAlign: 'center',
    marginTop: 20,
  }
});
