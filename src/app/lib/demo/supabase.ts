import { createHash } from "node:crypto";
import {
  SAMPLE_SHIPPING_ADDRESS,
  buildSampleOrders,
  type SampleOrderItemRow,
  type SampleOrderRow,
} from "@/app/data/sample-orders";

/**
 * In-memory stand-in for the Supabase client. The portfolio demo runs with no
 * database or other services, so `lib/supabase/server.ts` returns this instead.
 *
 * It implements only what the app calls, with the shapes `@supabase/supabase-js`
 * returns: the auth methods used by `lib/auth.ts`, `actions/auth.ts` and
 * `auth/confirm`, and the order reads in `lib/orders.ts`.
 *
 * - Session: every visitor is the demo customer, so there is no sign-in step
 *   and nothing to store in cookies.
 * - Data: the demo customer's six sample orders from `data/sample-orders.ts`.
 *   Rows and IDs derive from constants and the current UTC day, so every
 *   serverless instance builds identical data without coordinating.
 * - Read-only: sign-up is rejected like on a project with sign-ups disabled,
 *   and nothing writes orders because checkout has no admin client.
 */

const DAY_MS = 86_400_000;

export const DEMO_USER = {
  id: "5d1a7c2e-3b4f-4e8a-9c6d-2f0b1e7a4c93",
  email: "adaeze@example.com",
  fullName: SAMPLE_SHIPPING_ADDRESS.fullName,
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type OrderRow = Omit<SampleOrderRow, "items"> & {
  id: string;
  user_id: string;
  email: string;
  order_items: SampleOrderItemRow[];
};

interface Tables {
  orders: OrderRow[];
}

/** A UUID (v4 layout) derived from `seed`, so every instance assigns the same IDs. */
export function stableUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  const variant = "89ab"[Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

let cache: { day: number; tables: Tables } | null = null;

/**
 * The demo's rows. Dates are anchored to the start of the current UTC day, so
 * instances started at different times still agree. Rebuilding is synchronous,
 * so concurrent requests can never observe a half-built day.
 */
export function getDemoTables(now = Date.now()): Tables {
  const day = Math.floor(now / DAY_MS) * DAY_MS;
  if (cache?.day !== day) {
    const orders = buildSampleOrders(day).map(
      ({ items, ...order }, index): OrderRow => ({
        ...order,
        id: stableUuid(`velour-skin-demo-order-${index}`),
        user_id: DEMO_USER.id,
        email: DEMO_USER.email,
        order_items: items,
      }),
    );
    cache = { day, tables: { orders } };
  }
  return cache.tables;
}

// ---------------------------------------------------------------------------
// Query builder (the subset of PostgREST's that the app uses)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

export interface DemoError {
  code: string;
  message: string;
}

interface Result<T> {
  data: T;
  error: DemoError | null;
}

/** The query builder methods the app chains, with PostgREST's signatures. */
export interface DemoQueryBuilder extends PromiseLike<Result<unknown>> {
  select(columns?: string): DemoQueryBuilder;
  eq(column: string, value: unknown): DemoQueryBuilder;
  neq(column: string, value: unknown): DemoQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): DemoQueryBuilder;
  limit(count: number): DemoQueryBuilder;
  maybeSingle(): Promise<Result<unknown>>;
}

class DemoQuery implements DemoQueryBuilder {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private readonly sorts: Array<{ column: string; ascending: boolean }> = [];
  private maxRows = Number.POSITIVE_INFINITY;

  constructor(
    private readonly rows: readonly Row[],
    private readonly error: DemoError | null = null,
  ) {}

  /** Rows already carry every column and their embedded `order_items`. */
  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}): this {
    this.sorts.push({ column, ascending });
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  async maybeSingle(): Promise<Result<unknown>> {
    const { data, error } = this.execute();
    if (error) return { data: null, error };
    if (data.length > 1) {
      return { data: null, error: { code: "PGRST116", message: "The result contains more than one row" } };
    }
    return { data: data[0] ?? null, error: null };
  }

  then<TResult1 = Result<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Result<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const { data, error } = this.execute();
    return Promise.resolve<Result<unknown>>(error ? { data: null, error } : { data, error: null }).then(
      onfulfilled,
      onrejected,
    );
  }

  private execute(): Result<Row[]> {
    if (this.error) return { data: [], error: this.error };
    const rows = this.rows.filter((row) => this.filters.every((matches) => matches(row)));
    rows.sort((a, b) => {
      for (const { column, ascending } of this.sorts) {
        const x = a[column] as string | number;
        const y = b[column] as string | number;
        if (x !== y) return (x < y ? -1 : 1) * (ascending ? 1 : -1);
      }
      return 0;
    });
    return { data: rows.slice(0, this.maxRows), error: null };
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

interface Claims {
  sub: string;
  email?: string;
  user_metadata?: { full_name?: unknown };
}

interface AuthUser {
  id: string;
  email: string;
}

export interface DemoSupabaseClient {
  auth: {
    getClaims(): Promise<Result<{ claims: Claims } | null>>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<Result<{ user: AuthUser | null }>>;
    signUp(credentials: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    }): Promise<Result<{ user: AuthUser | null; session: null }>>;
    verifyOtp(params: { type: string; token_hash: string }): Promise<{ error: DemoError | null }>;
    exchangeCodeForSession(code: string): Promise<{ error: DemoError | null }>;
  };
  from(table: string): DemoQueryBuilder;
}

const EMAIL_LINKS_DISABLED: DemoError = {
  code: "email_provider_disabled",
  message: "The demo does not send emails",
};

export function createDemoClient(): DemoSupabaseClient {
  return {
    auth: {
      async getClaims() {
        return {
          data: {
            claims: { sub: DEMO_USER.id, email: DEMO_USER.email, user_metadata: { full_name: DEMO_USER.fullName } },
          },
          error: null,
        };
      },
      // Already signed in as the demo customer, whatever the credentials.
      async signInWithPassword() {
        return { data: { user: { id: DEMO_USER.id, email: DEMO_USER.email } }, error: null };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: { code: "signup_disabled", message: "Signups not allowed for this instance" },
        };
      },
      async verifyOtp() {
        return { error: EMAIL_LINKS_DISABLED };
      },
      async exchangeCodeForSession() {
        return { error: EMAIL_LINKS_DISABLED };
      },
    },
    from(table) {
      if (table !== "orders") {
        return new DemoQuery([], { code: "42P01", message: `relation "public.${table}" does not exist` });
      }
      return new DemoQuery(getDemoTables().orders);
    },
  };
}
