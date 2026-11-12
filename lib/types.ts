export type Role = 'admin' | 'user';

export interface UserSession {
  id: string;
  ownerId: string;
  email: string;
  name: string;
  role: Role;
  loginAt: string;
}

export interface CashierAccount {
  id: string;
  ownerId: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export type ProductCategory =
  | 'Elektronik'
  | 'Sembako & Pangan'
  | 'Minuman & Snack'
  | 'Alat Tulis Kantor'
  | 'Kebutuhan Rumah';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Elektronik',
  'Sembako & Pangan',
  'Minuman & Snack',
  'Alat Tulis Kantor',
  'Kebutuhan Rumah',
];

export interface Product {
  id: string;
  ownerId?: string;
  sku: string;
  name: string;
  category: ProductCategory;
  buyPrice: number;    // Harga modal/beli (khusus Admin)
  sellPrice: number;   // Harga jual kasir
  stock: number;       // Sisa stok saat ini
  minStock: number;    // Batas minimum peringatan stok
  unit: string;        // pcs, pack, botol, kg, rim, box, unit
  description?: string;
  updatedAt: string;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer Bank' | 'Kartu Debit';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Tunai',
  'QRIS',
  'Transfer Bank',
  'Kartu Debit',
];

export interface TransactionItem {
  productId: string;
  sku: string;
  name: string;
  buyPrice?: number;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  ownerId?: string;
  invoiceNo: string;
  createdAt: string;
  cashierEmail: string;
  cashierName: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status?: 'COMPLETED' | 'VOIDED';
  voidReason?: string;
  voidedAt?: string;
}

export interface StockLog {
  id: string;
  ownerId?: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
  operator: string;
}

export type QrisCardTheme = 'classic' | 'ocean' | 'emerald' | 'dark';

export interface StorePaymentSettings {
  ownerId: string;
  qrisPayload: string;
  qrisImageData: string;
  qrisMerchantName: string;
  qrisNmid: string;
  qrisTheme: QrisCardTheme;
  qrisCustomNote: string;
  showQrisOnReceipt: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  updatedAt: string;
}
