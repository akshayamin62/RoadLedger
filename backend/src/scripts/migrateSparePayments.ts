import { SparePart } from "../models/SparePart.js";
import { applySparePaymentTotals } from "../services/payment.service.js";

export async function migrateSparePartPayments(): Promise<void> {
  const parts = await SparePart.find({
    $or: [
      { payments: { $exists: false } },
      { paymentStatus: { $exists: false } },
      { totalPaidPaise: { $exists: false } },
      { pendingAmountPaise: { $exists: false } },
    ],
  });

  for (const part of parts) {
    if (!Array.isArray(part.payments)) {
      part.payments = [];
    }
    applySparePaymentTotals(part);
    await part.save();
  }

  if (parts.length) {
    console.log(`Migrated ${parts.length} spare part record(s) to payment tracking`);
  }
}
