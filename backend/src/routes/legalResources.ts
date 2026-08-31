import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { parsePaginationQuery } from "../lib/pagination";
import { normalizeSearchTerm } from "../lib/search";
import { sendInternalError } from "../lib/httpError";
import {
  isLegalResourceKind,
  LEGAL_RESOURCE_ATTRIBUTION,
  type LegalResource,
} from "../lib/resources/legalAiResources";
import {
  getLegalResource,
  getLegalResourceFacets,
  listLegalResources,
} from "../lib/resources/legalResourceCatalog";

export const legalResourcesRouter = Router();

legalResourcesRouter.use(requireAuth);

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

function queryString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Public shape. Internal column names never leave the route. */
function toPublic(resource: LegalResource) {
  return {
    slug: resource.slug,
    name: resource.name,
    kind: resource.kind,
    category: resource.category,
    description: resource.description,
    paper_url: resource.paperUrl,
    dataset_url: resource.datasetUrl,
    site_url: resource.siteUrl,
    languages: resource.languages,
    jurisdictions: resource.jurisdictions,
    tags: resource.tags,
  };
}

legalResourcesRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const rawKind = queryString(req.query.kind);
    if (rawKind !== null && !isLegalResourceKind(rawKind)) {
      return void res.status(400).json({ detail: "Unknown resource kind" });
    }
    const kind = rawKind;

    const { limit, offset } = parsePaginationQuery(
      req.query as Record<string, unknown>,
    );
    const page = await listLegalResources(createServerSupabase(), {
      limit,
      offset,
      search: normalizeSearchTerm(req.query.q),
      kind,
      category: queryString(req.query.category),
      language: queryString(req.query.language),
      jurisdiction: queryString(req.query.jurisdiction),
    });

    res.json({
      resources: page.resources.map(toPublic),
      total: page.total,
      limit,
      offset,
      // Tells the client the catalog has not been seeded yet, so it can say so
      // rather than presenting stale data as live.
      bundled: page.bundled,
      attribution: LEGAL_RESOURCE_ATTRIBUTION,
    });
  }),
);

legalResourcesRouter.get(
  "/filter-options",
  asyncRoute(async (_req, res) => {
    res.json(await getLegalResourceFacets(createServerSupabase()));
  }),
);

legalResourcesRouter.get(
  "/:slug",
  asyncRoute(async (req, res) => {
    const resource = await getLegalResource(
      createServerSupabase(),
      req.params.slug,
    );
    if (!resource) {
      return void res.status(404).json({ detail: "Resource not found" });
    }
    res.json({ ...toPublic(resource), attribution: LEGAL_RESOURCE_ATTRIBUTION });
  }),
);

legalResourcesRouter.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    sendInternalError(res, err);
  },
);
