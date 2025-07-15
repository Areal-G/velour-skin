import { Input, Select } from "@/app/components/ui/Input";
import { US_STATES } from "@/app/lib/shipping";

interface ShippingFormProps {
  values?: Record<string, string>;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/** Contact and US delivery address fields (uncontrolled, with autofill hints). */
export function ShippingForm({ values = {}, errors = {}, disabled }: ShippingFormProps) {
  return (
    <div className="space-y-10">
      <fieldset disabled={disabled} className="space-y-5">
        <legend className="mb-5 font-serif text-3xl">Contact</legend>
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values.email}
          error={errors.email}
          hint="We'll send your order confirmation here."
        />
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="shipping tel"
          placeholder="(212) 555-0147"
          required
          defaultValue={values.phone}
          error={errors.phone}
          hint="Our carrier may text or call about your delivery."
        />
      </fieldset>

      <fieldset disabled={disabled} className="space-y-5">
        <legend className="mb-5 font-serif text-3xl">Delivery address</legend>
        <input type="hidden" name="country" value="US" />
        <Input
          label="Full name"
          name="fullName"
          autoComplete="shipping name"
          required
          defaultValue={values.fullName}
          error={errors.fullName}
        />
        <Input
          label="Street address"
          name="line1"
          autoComplete="shipping address-line1"
          placeholder="e.g. 245 W 17th St"
          required
          defaultValue={values.line1}
          error={errors.line1}
        />
        <Input
          label="Apartment, suite or unit (optional)"
          name="line2"
          autoComplete="shipping address-line2"
          defaultValue={values.line2}
          error={errors.line2}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="City"
            name="city"
            autoComplete="shipping address-level2"
            placeholder="e.g. Brooklyn"
            required
            defaultValue={values.city}
            error={errors.city}
          />
          <Select
            label="State"
            name="state"
            autoComplete="shipping address-level1"
            required
            defaultValue={values.state || ""}
            error={errors.state}
          >
            <option value="" disabled>
              Choose a state
            </option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="ZIP code"
            name="postcode"
            inputMode="numeric"
            autoComplete="shipping postal-code"
            placeholder="e.g. 10011"
            required
            defaultValue={values.postcode}
            error={errors.postcode}
          />
          <Input label="Country" name="countryDisplay" value="United States" readOnly disabled />
        </div>
      </fieldset>
    </div>
  );
}
