import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const gstSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GST number. Example: 24ABCDE1234F1Z5",
  );

export const optionalGstSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => (value ?? "").toString().trim().toUpperCase())
  .refine(
    (value) =>
      value === "" ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value),
    "Invalid GST number. Example: 24ABCDE1234F1Z5",
  );

export const vehicleNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/,
    "Invalid registration number. Example: GJ06AB1234",
  );

export const rupeeAmountSchema = z.coerce.number().positive("Amount must be greater than zero");
export const optionalRupeeAmountSchema = z.coerce.number().min(0);
