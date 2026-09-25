import type { ExpirationStatus } from "./expiration";
import type { TransactionType } from "@/db/schema";

export type BatchDto = {
  id: string;
  medicineId: string;
  quantity: number;
  unit: string;
  expirationDate: string | null;
  addedAt: string;
  notes: string | null;
  status: ExpirationStatus;
  daysUntilExpiration: number | null;
};

export type MedicineDto = {
  id: string;
  name: string;
  activeIngredient: string | null;
  strength: string | null;
  form: string;
  notes: string | null;
  batches: BatchDto[];
  /** Total across every batch, including expired ones. */
  totalQuantity: number;
  /** Total excluding expired batches — what can actually be taken. */
  usableQuantity: number;
  /** Most common unit across batches, used for display. */
  unit: string;
  /** The most urgent expiration status among the batches. */
  worstStatus: ExpirationStatus;
  nextExpirationDate: string | null;
};

export type TreatmentDto = {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineStrength: string | null;
  name: string | null;
  doseQuantity: number;
  dosesPerDay: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  active: boolean;
  unit: string;
  perDay: number;
  available: number;
  daysRemaining: number | null;
  runOutDate: string | null;
  sufficiency: {
    daysToCover: number;
    required: number;
    deficit: number;
    sufficient: boolean;
  } | null;
  lastDoseAt: string | null;
  dosesTakenToday: number;
};

export type TransactionDto = {
  id: string;
  medicineId: string;
  medicineName: string;
  batchId: string | null;
  type: TransactionType;
  quantityDelta: number;
  unit: string;
  quantityAfter: number | null;
  reason: string | null;
  createdAt: string;
};

export type DashboardData = {
  today: string;
  overview: {
    medicineCount: number;
    activeTreatmentCount: number;
    expiredPackages: number;
    expiringSoonPackages: number;
    totalPackages: number;
  };
  treatments: TreatmentDto[];
  expiringSoon: Array<BatchDto & { medicineName: string; medicineStrength: string | null }>;
  expired: Array<BatchDto & { medicineName: string; medicineStrength: string | null }>;
  runningLow: TreatmentDto[];
};
