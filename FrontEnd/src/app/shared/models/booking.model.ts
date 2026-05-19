export interface BookingRequest {
  slotId: string;
  attractionId: string;
  attractionName: string;
  productTitle: string;
  passengers: BookingPassenger[];
}

export interface BookingPassenger {
  priceTierId: string;
  priceTierLabel: string;
  unitPrice: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
}

export interface BookingResponse {
  bookingId: string;
  pnrCode: string;
  status: string;
  totalAmount: number;
  currency: string;
  activityDate: string;
  attractionName: string;
  attractionImage?: string;
  totalPassengers: number;
}

export interface BookingSummary {
  id: string;
  pnrCode: string;
  attractionName?: string;
  activityDate: string;
  statusName: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  slotDate: string;
  startTime: string;
  endTime?: string;
  capacityTotal: number;
  capacityAvailable: number;
}

export interface DailyAvailability {
  fecha: string;
  cuposDisponibles: number;
  slots?: AvailabilitySlot[];
}
