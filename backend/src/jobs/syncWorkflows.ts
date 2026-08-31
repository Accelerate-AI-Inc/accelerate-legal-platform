import "dotenv/config";
import { createServerSupabase } from "../lib/supabase";
import { syncWorkflowCatalog } from "../lib/workflowCatalogSync";

async function main() {
  const result = await syncWorkflowCatalog(createServerSupabase());
  console.log(
    `Synced ${result.workflows} Accelerate Legal workflows and ${result.references} reference files from ${result.sourceCommit}`,
  );
}

void main().catch((error) => {
  console.error("Accelerate Legal workflow sync failed", error);
  process.exit(1);
});
