import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "@/app/lib/pricing";
import { SHIPPING_COUNTRIES, US_STATE_CODES } from "@/app/lib/shipping";

// Normalize first, then validate, so pasted addresses with stray spaces pass.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ error: "Enter a valid email address" }));

export const cartLinesSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(32),
      variantId: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
    }),
  )
  .min(1, { error: "Your bag is empty" })
  .max(50, { error: "Too many items in your bag" });

export type CartLineInput = z.infer<typeof cartLinesSchema>[number];


const countryCodes = SHIPPING_COUNTRIES.map((c) => c.code) as [string, ...string[]];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/**
 * US phone numbers, local ((212) 555-0147) or international
 * (+1 212 555 0147). Normalized to E.164 (+12125550147).
 */
const usPhone = z
  .string()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^(?:\+?1)?[2-9]\d{2}[2-9]\d{6}$/, { error: "Enter a valid US phone number" }))
  .transform((v) => `+1${v.slice(-10)}`);

export const shippingSchema = z.object({
  email,
  fullName: z.string().trim().min(2, { error: "Enter your full name" }).max(100),
  line1: z.string().trim().min(3, { error: "Enter your street address" }).max(120),
  line2: optionalText(120),
  city: z.string().trim().min(2, { error: "Enter your city" }).max(80),
  state: z.enum(US_STATE_CODES, { error: "Choose your state" }),
  postcode: z
    .string({ error: "Enter your ZIP code" })
    .trim()
    .regex(/^\d{5}(?:-\d{4})?$/, { error: "Enter a 5-digit ZIP code" }),
  country: z.enum(countryCodes, { error: "We currently deliver within the United States only" }).default("US"),
  // Required: carriers may need to reach you about delivery.
  phone: usPhone,
});

export type ShippingInput = z.infer<typeof shippingSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password" }).max(128),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Enter your full name" }).max(100),
    email,
    password: z
      .string()
      .min(8, { error: "Use at least 8 characters" })
      .max(128)
      .regex(/[A-Za-z]/, { error: "Include at least one letter" })
      .regex(/\d/, { error: "Include at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const newsletterSchema = z.object({ email });

/** Flattens a ZodError into `{ field: firstMessage }` for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeRedirectPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  // URL parsers strip tabs/newlines and treat "\" like "/", so "/\t/evil.com"
  // would become "//evil.com". Reject them outright, then confirm the parsed
  // result stays on our own origin.
  if (!value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  const base = "http://same-origin.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
