export interface Attraction {
  id: string;
  slug: string;
  name: string;
  descriptionShort?: string;
  descriptionFull?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  meetingPoint?: string;
  ratingAverage: number;
  ratingCount: number;
  minAge?: number;
  maxGroupSize?: number;
  difficultyLevel?: string;
  isActive: boolean;
  isPublished: boolean;
  locationId?: string;
  locationName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  categoryName?: string;
  mainImageUrl?: string;
  media?: AttractionMedia[];
  tags?: Tag[];
  productOptions?: ProductOption[];
  inclusions?: AttractionInclusion[];
  itinerary?: TourItinerary;
}

export interface AttractionMedia {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  isMain: boolean;
  sortOrder: number;
  mediaTypeId: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ProductOption {
  id: string;
  slug: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  durationDescription?: string;
  cancelPolicyHours?: number;
  cancelPolicyText?: string;
  maxGroupSize?: number;
  minParticipants?: number;
  isActive: boolean;
  priceTiers?: PriceTier[];
}

export interface PriceTier {
  id: string;
  ticketCategoryId: string;
  ticketCategoryName?: string;
  price: number;
  currencyCode: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  countryCode?: string;
  parentId?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  nameEn?: string;
  ageRangeMin?: number;
  ageRangeMax?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface TourItinerary {
  id: string;
  attractionId: string;
  title: string;
  overview?: string;
  totalDistanceKm?: number;
  stops?: TourStop[];
}

export interface TourStop {
  id: string;
  stopNumber: number;
  name: string;
  description?: string;
  durationMinutes?: number;
  latitude?: number;
  longitude?: number;
  admissionType?: string;
}

export interface AttractionInclusion {
  attractionId: string;
  inclusionItemId: string;
  type: string;
  defaultText?: string;
  iconSlug?: string;
}
