import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_USER, createDemoClient, getDemoTables, stableUuid } from "@/app/lib/demo/supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

describe("demo data", () => {
  it("assigns stable UUIDs", () => {
    expect(stableUuid("a")).toBe(stableUuid("a"));
    expect(stableUuid("a")).not.toBe(stableUuid("b"));
    expect(stableUuid("a")).toMatch(UUID_RE);
  });

  it("is identical on every instance", async () => {
    const now = Date.UTC(2026, 10, 16, 9, 30);
    const first = getDemoTables(now);
    vi.resetModules();
    const fresh = await import("@/app/lib/demo/supabase");
    expect(fresh.getDemoTables(now)).toEqual(first);
    expect(first.orders.map((o) => o.id).every((id) => UUID_RE.test(id))).toBe(true);
  });

  it("anchors dates to the current UTC day", () => {
    const morning = Date.UTC(2026, 10, 16, 0, 5);
    const evening = Date.UTC(2026, 10, 16, 23, 55);
    const today = getDemoTables(morning);
    expect(getDemoTables(evening)).toEqual(today);
    expect(Date.parse(today.orders[0].created_at)).toBe(Date.UTC(2026, 10, 13));

    const tomorrow = getDemoTables(evening + DAY_MS);
    expect(tomorrow.orders.map((o) => o.id)).toEqual(today.orders.map((o) => o.id));
    expect(Date.parse(tomorrow.orders[0].created_at)).toBe(Date.UTC(2026, 10, 14));
  });

  it("serves the same rows to concurrent requests on a cold instance", async () => {
    vi.resetModules();
    const { createDemoClient: create } = await import("@/app/lib/demo/supabase");
    const results = await Promise.all(Array.from({ length: 20 }, () => create().from("orders").select("*")));
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0].data).toHaveLength(6);
  });
});

describe("demo auth", () => {
  const { auth } = createDemoClient();

  it("treats every visitor as the demo customer", async () => {
    const { data, error } = await auth.getClaims();
    expect(error).toBeNull();
    expect(data?.claims).toEqual({
      sub: DEMO_USER.id,
      email: DEMO_USER.email,
      user_metadata: { full_name: DEMO_USER.fullName },
    });
  });

  it("treats sign-in as already done", async () => {
    const { data, error } = await auth.signInWithPassword({ email: "anyone@example.com", password: "x" });
    expect(error).toBeNull();
    expect(data.user?.id).toBe(DEMO_USER.id);
  });

  it("refuses sign-ups and email links", async () => {
    const signUp = await auth.signUp({ email: "new@example.com", password: "Passw0rd!" });
    expect(signUp.error?.code).toBe("signup_disabled");
    expect(signUp.data.session).toBeNull();
    expect((await auth.verifyOtp({ type: "email", token_hash: "x" })).error).not.toBeNull();
    expect((await auth.exchangeCodeForSession("x")).error).not.toBeNull();
  });
});

describe("demo queries", () => {
  const client = createDemoClient();

  it("returns the demo customer's orders", async () => {
    const { data } = await client.from("orders").select("*").eq("user_id", DEMO_USER.id);
    expect(data).toHaveLength(6);
  });

  it("filters, sorts and limits", async () => {
    const { data } = await client
      .from("orders")
      .select("*")
      .neq("status", "canceled")
      .order("created_at", { ascending: true })
      .limit(3);
    const rows = data as Array<{ status: string; created_at: string }>;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status !== "canceled")).toBe(true);
    expect(rows.map((r) => r.created_at)).toEqual([...rows.map((r) => r.created_at)].sort());
  });

  it("returns one row or null from maybeSingle", async () => {
    const [order] = getDemoTables().orders;
    expect(await client.from("orders").select("*").eq("id", order.id).maybeSingle()).toEqual({
      data: order,
      error: null,
    });
    expect(await client.from("orders").select("*").eq("id", stableUuid("nope")).maybeSingle()).toEqual({
      data: null,
      error: null,
    });
    expect((await client.from("orders").select("*").maybeSingle()).error?.code).toBe("PGRST116");
  });

  it("reports unknown tables as errors", async () => {
    const { data, error } = await client.from("products").select("*");
    expect(data).toBeNull();
    expect(error?.code).toBe("42P01");
  });
});

describe("app modules on the stand-in", () => {
  afterEach(() => {
    vi.doUnmock("next/server");
    vi.resetModules();
  });

  it("signs every visitor in as the demo customer", async () => {
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    const { getCurrentUser } = await import("@/app/lib/auth");
    expect(await getCurrentUser()).toEqual({ id: DEMO_USER.id, email: DEMO_USER.email, fullName: DEMO_USER.fullName });
  });

  it("lists the customer's orders newest first and loads one by ID", async () => {
    const { getOrderForUser, getOrdersForUser } = await import("@/app/lib/orders");
    const orders = await getOrdersForUser(DEMO_USER.id);
    expect(orders).toHaveLength(6);
    expect(orders.map((o) => o.createdAt)).toEqual([...orders.map((o) => o.createdAt)].sort().reverse());
    expect(orders[0].items.length).toBeGreaterThan(0);
    expect(await getOrderForUser(DEMO_USER.id, orders[2].id)).toEqual(orders[2]);
  });
});
