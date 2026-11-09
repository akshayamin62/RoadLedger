export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
};

export type ApiList<T> = {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type Vehicle = {
  id: string;
  vehicleType: "TM" | "DUMPER";
  registrationNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type Party = {
  id: string;
  name: string;
  gstNumber: string;
  company: "JAY_ROADWAYS" | "JAY_INFRA";
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id?: string;
  amount: number;
  amountPaise: number;
  receivedDate: string;
  paymentMode: "NEFT" | "UPI" | "CASH";
  createdAt: string;
};

export type Transaction = {
  id: string;
  serialNumber: number;
  vehicleId: string;
  partyId: string;
  vehicle?: Vehicle;
  party?: Party;
  fromDate: string;
  toDate: string;
  billNumber: string;
  billAmount: number;
  payments: Payment[];
  totalReceivedAmount: number;
  pendingAmount: number;
  paymentStatus: "PENDING" | "PARTIALLY_PAID" | "PAID";
  createdAt: string;
  updatedAt: string;
};

export type SparePart = {
  id: string;
  partName: string;
  providerName: string;
  purchaseDate: string;
  amount: number;
  createdAt: string;
};

export type Activity = {
  id: string;
  serialNumber: number;
  action: string;
  module: string;
  description: string;
  relatedRecordId: string | null;
  dateTime: string;
  performedBy: string;
};
