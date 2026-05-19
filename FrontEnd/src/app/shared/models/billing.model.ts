export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  currencyCode: string;
  createdAt: string;
}

export interface InvoiceFull {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  customerName: string;
  taxId: string;
  email?: string;
  address?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  createdAt: string;
  details: InvoiceDetail[];
}

export interface InvoiceDetail {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalItem: number;
}

export interface PaymentResponse {
  id: string;
  bookingId: string;
  transactionExternalId?: string;
  paymentMethodName?: string;
  statusName?: string;
  amount: number;
  currencyCode: string;
  paidAt?: string;
  createdAt: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  paymentMethodId: number;
  amount: number;
  currencyCode: string;
}
