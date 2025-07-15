import { describe, expect, it } from "vitest";
import {
  cartLinesSchema,
  fieldErrors,
  registerSchema,
  safeRedirectPath,
  shippingSchema,
} from "@/app/lib/validations";

const validShipping = {
  email: "  Test@Example.COM ",
  fullName: "Test Customer",
  line1: "245 W 17th St",
  line2: "",
  city: "Brooklyn",
  state: "NY",
  postcode: "11201",
  country: "US",
  phone: "(212) 555-0147",
};

describe("shippingSchema", () => {
  it("normalizes valid input", () => {
    const result = shippingSchema.parse(validShipping);
    expect(result.email).toBe("test@example.com");
    expect(result.line2).toBeUndefined();
    expect(result.postcode).toBe("11201");
    expect(result.phone).toBe("+12125550147");
  });

  it.each(["2125550147", "+1 212 555 0147", "1-212-555-0147", "212.555.0147", "(415) 555-0123"])(
    "accepts US phone format %s",
    (phone) => {
      expect(shippingSchema.parse({ ...validShipping, phone }).phone).toMatch(/^\+1[2-9]\d{2}[2-9]\d{6}$/);
    },
  );

  it("defaults the country to the US and rejects others", () => {
    expect(shippingSchema.parse({ ...validShipping, country: undefined }).country).toBe("US");
    expect(shippingSchema.safeParse({ ...validShipping, country: "GB" }).success).toBe(false);
  });

  it("reports field-level errors", () => {
    const result = shippingSchema.safeParse({
      ...validShipping,
      email: "nope",
      state: "Atlantis",
      postcode: "12",
      phone: "12345",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["email", "phone", "postcode", "state"]);
  });
});

describe("cartLinesSchema", () => {
  it("accepts IDs and quantities only, within limits", () => {
    expect(cartLinesSchema.safeParse([{ productId: "vs-1", variantId: "vs-1-30ml", quantity: 2 }]).success).toBe(true);
    expect(cartLinesSchema.safeParse([]).success).toBe(false);
    expect(cartLinesSchema.safeParse([{ productId: "vs-1", variantId: "v", quantity: 11 }]).success).toBe(false);
    expect(cartLinesSchema.safeParse([{ productId: "vs-1", variantId: "v", quantity: 1.5 }]).success).toBe(false);
  });

  it("strips client-supplied prices", () => {
    const parsed = cartLinesSchema.parse([{ productId: "a", variantId: "b", quantity: 1, unitPriceCents: 1 }]);
    expect(parsed[0]).not.toHaveProperty("unitPriceCents");
  });
});

describe("registerSchema", () => {
  const base = { fullName: "Test Customer", email: "test@example.com", password: "s3curepass", confirmPassword: "s3curepass" };

  it("accepts a strong, matching password", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects weak or mismatched passwords", () => {
    expect(registerSchema.safeParse({ ...base, password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "lettersonly", confirmPassword: "lettersonly" }).success).toBe(false);
    const mismatch = registerSchema.safeParse({ ...base, confirmPassword: "different1" });
    expect(fieldErrors(mismatch.error!)).toHaveProperty("confirmPassword");
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/account/orders", "/account/orders"],
    ["https://evil.example", "/account"],
    ["//evil.example", "/account"],
    ["/\\evil.example", "/account"],
    ["/\t/evil.example", "/account"],
    ["/\n/evil.example", "/account"],
    ["/%09/evil.example", "/%09/evil.example"],
    ["/products?q=serum#top", "/products?q=serum#top"],
    [null, "/account"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
