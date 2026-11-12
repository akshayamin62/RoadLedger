import type { SparePartDocument } from "../models/SparePart";
import type { PaymentEntry, PaymentStatus, TransactionDocument } from "../models/Transaction";

export function computePaymentTotals(
  billAmountPaise: number,
  payments: Pick<PaymentEntry, "amountPaise">[],
) {
  const totalReceivedPaise = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  if (totalReceivedPaise > billAmountPaise) {
    throw new Error("Total payments cannot exceed bill amount");
  }
  const pendingAmountPaise = billAmountPaise - totalReceivedPaise;
  let paymentStatus: PaymentStatus = "PENDING";
  if (totalReceivedPaise === 0) paymentStatus = "PENDING";
  else if (pendingAmountPaise === 0) paymentStatus = "PAID";
  else paymentStatus = "PARTIALLY_PAID";

  return { totalReceivedPaise, pendingAmountPaise, paymentStatus };
}

export function applyPaymentTotals(doc: TransactionDocument) {
  const totals = computePaymentTotals(doc.billAmountPaise, doc.payments ?? []);
  doc.totalReceivedPaise = totals.totalReceivedPaise;
  doc.pendingAmountPaise = totals.pendingAmountPaise;
  doc.paymentStatus = totals.paymentStatus;
  return totals;
}

export function applySparePaymentTotals(doc: SparePartDocument) {
  const totals = computePaymentTotals(doc.amountPaise, doc.payments ?? []);
  doc.totalPaidPaise = totals.totalReceivedPaise;
  doc.pendingAmountPaise = totals.pendingAmountPaise;
  doc.paymentStatus = totals.paymentStatus;
  return totals;
}

export function emptyPaymentModeBreakdown() {
  return { NEFT: 0, UPI: 0, CASH: 0, CHEQUE: 0 };
}
