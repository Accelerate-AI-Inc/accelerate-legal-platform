import "dotenv/config";
import { createServerSupabase } from "../lib/supabase";
import {
  bundledLegalResources,
  LEGAL_RESOURCE_ATTRIBUTION,
} from "../lib/resources/legalAiResources";

/**
 * Load the bundled Legal AI resources catalog into Postgres.
 *
 * Idempotent: rows are keyed on (slug, content_hash), so re-running with an
 * unchanged dataset only refreshes the active flag. Regenerate the dataset with
 * `node scripts/import-legal-ai-resources.mjs` before running this.
 */
async function main() {
  const resources = bundledLegalResources();
  const db = createServerSupabase();
  const { error } = await db.rpc("replace_legal_ai_resources", {
    p_source_ref: LEGAL_RESOURCE_ATTRIBUTION.source,
    p_resources: resources,
  });
  if (error) throw error;
  console.log(
    `Synced ${resources.length} legal AI resources from ${LEGAL_RESOURCE_ATTRIBUTION.source}`,
  );
}

void main().catch((error) => {
  console.error("Legal AI resources sync failed", error);
  process.exit(1);
});
