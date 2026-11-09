import type { ActivityLogDocument } from "../models/ActivityLog.js";
import type { PartyDocument } from "../models/Party.js";
import type { SparePartDocument } from "../models/SparePart.js";
import type { TransactionDocument } from "../models/Transaction.js";
import type { UserDocument } from "../models/User.js";
import type { VehicleDocument } from "../models/Vehicle.js";
import { paiseToRupees } from "./money.js";

export function serializeUser(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function serializeVehicle(vehicle: VehicleDocument) {
  return {
    id: vehicle.id,
    vehicleType: vehicle.vehicleType,
    registrationNumber: vehicle.registrationNumber,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

export function serializeParty(party: PartyDocument) {
  return {
    id: party.id,
    name: party.name,
    gstNumber: party.gstNumber,
    company: party.company,
    createdAt: party.createdAt,
    updatedAt: party.updatedAt,
  };
}

function isVehicle(value: unknown): value is VehicleDocument {
  return Boolean(value && typeof value === "object" && "registrationNumber" in value);
}

function isParty(value: unknown): value is PartyDocument {
  return Boolean(value && typeof value === "object" && "gstNumber" in value);
}

export function serializeTransaction(tx: TransactionDocument) {
  const vehicle = isVehicle(tx.vehicleId) ? tx.vehicleId : null;
  const party = isParty(tx.partyId) ? tx.partyId : null;

  return {
    id: tx.id,
    serialNumber: tx.serialNumber,
    vehicleId: vehicle ? vehicle.id : tx.vehicleId.toString(),
    partyId: party ? party.id : tx.partyId.toString(),
    vehicle: vehicle ? serializeVehicle(vehicle) : undefined,
    party: party ? serializeParty(party) : undefined,
    fromDate: tx.fromDate,
    toDate: tx.toDate,
    billNumber: tx.billNumber,
    billAmount: paiseToRupees(tx.billAmountPaise),
    billAmountPaise: tx.billAmountPaise,
    payments: tx.payments.map((payment) => ({
      id: (payment as { _id?: { toString(): string } })._id?.toString(),
      amount: paiseToRupees(payment.amountPaise),
      amountPaise: payment.amountPaise,
      receivedDate: payment.receivedDate,
      paymentMode: payment.paymentMode,
      createdAt: payment.createdAt,
    })),
    totalReceivedAmount: paiseToRupees(tx.totalReceivedPaise),
    pendingAmount: paiseToRupees(tx.pendingAmountPaise),
    paymentStatus: tx.paymentStatus,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

export function serializeSparePart(part: SparePartDocument) {
  return {
    id: part.id,
    partName: part.partName,
    providerName: part.providerName,
    purchaseDate: part.purchaseDate,
    amount: paiseToRupees(part.amountPaise),
    amountPaise: part.amountPaise,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
  };
}

export function serializeActivity(log: ActivityLogDocument) {
  return {
    id: log.id,
    serialNumber: log.serialNumber,
    action: log.action,
    module: log.module,
    description: log.description,
    relatedRecordId: log.relatedRecordId ?? null,
    dateTime: log.createdAt,
    performedBy: log.performedBy,
  };
}
