-- Migration date: 2026-08-31
-- Legal AI resources catalog.
--
-- A curated, read-mostly reference table with no per-user ownership, seeded
-- from backend/src/lib/resources/legalAiResources.json by `npm run sync:resources`.
-- Modelled on accelerate_workflows: content-addressed rows, replace-in-place
-- through one transactional RPC, and a partial unique index over the active set
-- so historical rows stay addressable.
--
-- Security follows the house convention: no policies, RLS on as defence in
-- depth, all access through the service role.
--
-- Safe to re-run.

create extension if not exists pg_trgm;

create table if not exists public.legal_ai_resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  kind text not null,
  category text not null,
  description text not null,
  paper_url text,
  dataset_url text,
  site_url text,
  languages text[] not null default array[]::text[],
  jurisdictions text[] not null default array[]::text[],
  tags text[] not null default array[]::text[],
  source_ref text,
  content_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_ai_resources_slug_hash_unique
    unique(slug, content_hash),
  constraint legal_ai_resources_kind_check
    check(kind in ('corpus', 'benchmark', 'website')),
  constraint legal_ai_resources_content_hash_check
    check(content_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists legal_ai_resources_active_slug_idx
  on public.legal_ai_resources(slug)
  where active;

create index if not exists legal_ai_resources_active_browse_idx
  on public.legal_ai_resources(active, kind, category, name);

-- Trigram index so the leading-wildcard search the browse route issues can use
-- an index scan rather than a sequential one, matching search_library_documents.
create index if not exists legal_ai_resources_search_idx
  on public.legal_ai_resources
  using gin ((name || ' ' || description) gin_trgm_ops);

create index if not exists legal_ai_resources_jurisdictions_idx
  on public.legal_ai_resources using gin (jurisdictions);

create index if not exists legal_ai_resources_languages_idx
  on public.legal_ai_resources using gin (languages);

alter table public.legal_ai_resources enable row level security;

-- ---------------------------------------------------------------------------
-- Replace the active catalog as one transaction.
--
-- Historical rows are kept (deactivated) so a slug referenced by an older
-- client still resolves. Re-running with unchanged content is a no-op beyond
-- the active flag flip, because rows are keyed on (slug, content_hash).
-- ---------------------------------------------------------------------------
create or replace function public.replace_legal_ai_resources(
  p_source_ref text,
  p_resources jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
begin
  if p_resources is null or jsonb_typeof(p_resources) <> 'array' then
    raise exception 'p_resources must be a JSON array';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('legal_ai_resources', 0));

  update public.legal_ai_resources set active = false where active;

  for item in select * from jsonb_array_elements(p_resources) loop
    insert into public.legal_ai_resources (
      slug, name, kind, category, description,
      paper_url, dataset_url, site_url,
      languages, jurisdictions, tags,
      source_ref, content_hash, active, updated_at
    )
    values (
      item->>'slug',
      item->>'name',
      item->>'kind',
      item->>'category',
      item->>'description',
      nullif(item->>'paperUrl', ''),
      nullif(item->>'datasetUrl', ''),
      nullif(item->>'siteUrl', ''),
      coalesce(
        (select array_agg(value::text)
           from jsonb_array_elements_text(item->'languages') as value),
        array[]::text[]
      ),
      coalesce(
        (select array_agg(value::text)
           from jsonb_array_elements_text(item->'jurisdictions') as value),
        array[]::text[]
      ),
      coalesce(
        (select array_agg(value::text)
           from jsonb_array_elements_text(item->'tags') as value),
        array[]::text[]
      ),
      p_source_ref,
      item->>'contentHash',
      true,
      now()
    )
    on conflict (slug, content_hash) do update
      set active = true,
          name = excluded.name,
          kind = excluded.kind,
          category = excluded.category,
          description = excluded.description,
          paper_url = excluded.paper_url,
          dataset_url = excluded.dataset_url,
          site_url = excluded.site_url,
          languages = excluded.languages,
          jurisdictions = excluded.jurisdictions,
          tags = excluded.tags,
          source_ref = excluded.source_ref,
          updated_at = now();
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Distinct facet values for the browse filters, in one round trip.
-- Mirrors get_workflow_filter_options.
-- ---------------------------------------------------------------------------
create or replace function public.get_legal_resource_filter_options()
returns table (
  kinds text[],
  categories text[],
  languages text[],
  jurisdictions text[]
)
language sql
stable
as $$
  with active_resources as (
    select * from public.legal_ai_resources where active
  )
  select
    coalesce(
      (select array_agg(distinct kind order by kind) from active_resources),
      array[]::text[]
    ) as kinds,
    coalesce(
      (select array_agg(distinct category order by category) from active_resources),
      array[]::text[]
    ) as categories,
    coalesce(
      (select array_agg(distinct language order by language)
         from active_resources r
         cross join lateral unnest(coalesce(r.languages, array[]::text[])) language
        where nullif(trim(language), '') is not null),
      array[]::text[]
    ) as languages,
    coalesce(
      (select array_agg(distinct jurisdiction order by jurisdiction)
         from active_resources r
         cross join lateral unnest(coalesce(r.jurisdictions, array[]::text[])) jurisdiction
        where nullif(trim(jurisdiction), '') is not null),
      array[]::text[]
    ) as jurisdictions;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.legal_ai_resources from anon, authenticated;
grant select, insert, update, delete
  on public.legal_ai_resources
  to service_role;

revoke all on function public.replace_legal_ai_resources(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.get_legal_resource_filter_options()
  from public, anon, authenticated;

grant execute
  on function public.replace_legal_ai_resources(text, jsonb)
  to service_role;
grant execute
  on function public.get_legal_resource_filter_options()
  to service_role;
