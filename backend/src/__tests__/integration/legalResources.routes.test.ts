import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, rpc, eq, contains, or, range, order, select } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  contains: vi.fn(),
  or: vi.fn(),
  range: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  createServerSupabase: () => ({ from, rpc }),
}));

vi.mock("../../middleware/auth", () => ({
  requireAuth: (
    _req: unknown,
    res: { locals: Record<string, unknown> },
    next: () => void,
  ) => {
    res.locals.userId = "u1";
    next();
  },
}));

import { legalResourcesRouter } from "../../routes/legalResources";

/**
 * A chainable Supabase query stub. `range` resolves the query, so it carries
 * the result; `maybeSingle` covers the by-slug lookup.
 */
function queryReturning(
  data: unknown,
  { count = null as number | null, error = null as unknown } = {},
) {
  const query: Record<string, unknown> = {};
  select.mockImplementation(() => query);
  eq.mockImplementation(() => query);
  contains.mockImplementation(() => query);
  or.mockImplementation(() => query);
  order.mockImplementation(() => query);
  range.mockImplementation(() =>
    Promise.resolve({ data, error, count: count ?? (Array.isArray(data) ? data.length : 0) }),
  );
  query.select = select;
  query.eq = eq;
  query.contains = contains;
  query.or = or;
  query.order = order;
  query.range = range;
  query.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return query;
}

const ROW = {
  slug: "lecard",
  name: "LeCaRD",
  kind: "benchmark",
  category: "Legal Case Retrieval",
  description: "A Chinese legal case retrieval benchmark.",
  paper_url: "https://example.test/paper",
  dataset_url: "https://example.test/data",
  site_url: null,
  languages: ["Chinese"],
  jurisdictions: ["China"],
  tags: ["benchmark", "chinese"],
  content_hash: "a".repeat(64),
};

const app = express();
app.use(express.json());
app.use("/legal-resources", legalResourcesRouter);

describe("legal resources catalog routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active resources and hides internal columns", async () => {
    from.mockImplementation((table: string) => {
      expect(table).toBe("legal_ai_resources");
      return queryReturning([ROW], { count: 1 });
    });

    const response = await request(app).get("/legal-resources");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.bundled).toBe(false);
    expect(response.body.resources).toEqual([
      expect.objectContaining({ slug: "lecard", name: "LeCaRD" }),
    ]);
    // content_hash is an implementation detail of the replace-in-place seed.
    expect(response.body.resources[0]).not.toHaveProperty("content_hash");
    expect(eq).toHaveBeenCalledWith("active", true);
  });

  it("always carries the upstream attribution", async () => {
    from.mockImplementation(() => queryReturning([ROW], { count: 1 }));

    const response = await request(app).get("/legal-resources");

    expect(response.body.attribution).toEqual({
      source: "https://github.com/CSHaitao/Awesome-LegalAI-Resources",
      license: "MIT",
    });
  });

  it("pushes every filter down to the query", async () => {
    from.mockImplementation(() => queryReturning([ROW], { count: 1 }));

    const response = await request(app).get(
      "/legal-resources?kind=benchmark&category=Legal%20Case%20Retrieval&language=Chinese&jurisdiction=China&q=retrieval",
    );

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("kind", "benchmark");
    expect(eq).toHaveBeenCalledWith("category", "Legal Case Retrieval");
    expect(contains).toHaveBeenCalledWith("languages", ["Chinese"]);
    expect(contains).toHaveBeenCalledWith("jurisdictions", ["China"]);
    expect(or).toHaveBeenCalledWith(
      expect.stringContaining("name.ilike.%retrieval%"),
    );
  });

  it("rejects an unknown kind before touching the database", async () => {
    const response = await request(app).get("/legal-resources?kind=treaty");

    expect(response.status).toBe(400);
    expect(response.body.detail).toBe("Unknown resource kind");
    expect(from).not.toHaveBeenCalled();
  });

  // The catalog is static reference data, so an unseeded table must still
  // answer — otherwise a fresh install shows an empty Resources page.
  it("falls back to the bundled dataset when the table is empty", async () => {
    from.mockImplementation(() => queryReturning([], { count: 0 }));

    const response = await request(app).get("/legal-resources");

    expect(response.status).toBe(200);
    expect(response.body.bundled).toBe(true);
    expect(response.body.resources.length).toBeGreaterThan(0);
  });

  it("does not fall back on a genuine end-of-results page", async () => {
    from.mockImplementation(() => queryReturning([], { count: 66 }));

    const response = await request(app).get("/legal-resources?offset=100");

    expect(response.status).toBe(200);
    expect(response.body.bundled).toBe(false);
    expect(response.body.resources).toEqual([]);
  });

  it("serves facets from the RPC when the catalog is seeded", async () => {
    rpc.mockImplementation(() => ({
      maybeSingle: () =>
        Promise.resolve({
          data: {
            kinds: ["benchmark"],
            categories: ["Legal Case Retrieval"],
            languages: ["Chinese"],
            jurisdictions: ["China"],
          },
          error: null,
        }),
    }));

    const response = await request(app).get("/legal-resources/filter-options");

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("get_legal_resource_filter_options");
    expect(response.body.kinds).toEqual(["benchmark"]);
  });

  it("falls back to bundled facets when the RPC returns nothing", async () => {
    rpc.mockImplementation(() => ({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    }));

    const response = await request(app).get("/legal-resources/filter-options");

    expect(response.status).toBe(200);
    expect(response.body.kinds).toEqual(["benchmark", "corpus", "website"]);
  });

  it("returns one resource by slug", async () => {
    from.mockImplementation(() => queryReturning(ROW));

    const response = await request(app).get("/legal-resources/lecard");

    expect(response.status).toBe(200);
    expect(response.body.slug).toBe("lecard");
    expect(eq).toHaveBeenCalledWith("slug", "lecard");
  });

  it("404s for a slug that is in neither the table nor the bundle", async () => {
    from.mockImplementation(() => queryReturning(null));

    const response = await request(app).get("/legal-resources/not-a-resource");

    expect(response.status).toBe(404);
    expect(response.body.detail).toBe("Resource not found");
  });

  it("resolves a bundled slug when the table has no row for it", async () => {
    from.mockImplementation(() => queryReturning(null));

    const response = await request(app).get("/legal-resources/multilegalpile");

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("MultiLegalPile");
  });
});
