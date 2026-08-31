-- Migration date: 2026-08-31
-- Rename the curated workflow catalog off the previous product slug.
--
-- The tables, their constraints and indexes, and the two RPCs that operate on
-- them all carried the old brand. The schema-drift check compares constraint
-- and index names as well as table names, so every dependent object is renamed
-- here and mirrored in backend/schema.sql.
--
-- Safe to re-run: each rename is guarded on the old object still existing, and
-- the functions are recreated with `create or replace`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.mike_workflows') is not null
     and to_regclass('public.accelerate_workflows') is null then
    alter table public.mike_workflows rename to accelerate_workflows;
  end if;

  if to_regclass('public.mike_workflow_reference_files') is not null
     and to_regclass('public.accelerate_workflow_reference_files') is null then
    alter table public.mike_workflow_reference_files
      rename to accelerate_workflow_reference_files;
  end if;
end
$$;

-- The foreign-key column names the parent table, so it is renamed too.
do $$
begin
  if to_regclass('public.accelerate_workflow_reference_files') is not null
     and exists (
       select 1
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'accelerate_workflow_reference_files'
          and column_name = 'mike_workflow_id'
     ) then
    alter table public.accelerate_workflow_reference_files
      rename column mike_workflow_id to accelerate_workflow_id;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Constraints and indexes
-- ---------------------------------------------------------------------------
do $$
declare
  renames text[][] := array[
    ['mike_workflows_key_hash_unique', 'accelerate_workflows_key_hash_unique'],
    ['mike_workflows_distribution_check', 'accelerate_workflows_distribution_check'],
    ['mike_workflows_type_check', 'accelerate_workflows_type_check'],
    ['mike_workflows_source_commit_check', 'accelerate_workflows_source_commit_check'],
    ['mike_workflows_content_hash_check', 'accelerate_workflows_content_hash_check']
  ];
  entry text[];
begin
  foreach entry slice 1 in array renames loop
    if exists (
      select 1
        from pg_constraint
        join pg_class on pg_class.oid = pg_constraint.conrelid
       where pg_constraint.conname = entry[1]
         and pg_class.relname = 'accelerate_workflows'
    ) then
      execute format(
        'alter table public.accelerate_workflows rename constraint %I to %I',
        entry[1],
        entry[2]
      );
    end if;
  end loop;

  if exists (
    select 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
     where pg_constraint.conname = 'mike_workflow_reference_files_name_unique'
       and pg_class.relname = 'accelerate_workflow_reference_files'
  ) then
    alter table public.accelerate_workflow_reference_files
      rename constraint mike_workflow_reference_files_name_unique
      to accelerate_workflow_reference_files_name_unique;
  end if;

  if exists (
    select 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
     where pg_constraint.conname = 'mike_workflow_reference_files_hash_check'
       and pg_class.relname = 'accelerate_workflow_reference_files'
  ) then
    alter table public.accelerate_workflow_reference_files
      rename constraint mike_workflow_reference_files_hash_check
      to accelerate_workflow_reference_files_hash_check;
  end if;
end
$$;

do $$
declare
  renames text[][] := array[
    ['mike_workflows_active_key_idx', 'accelerate_workflows_active_key_idx'],
    ['mike_workflows_active_distribution_type_idx', 'accelerate_workflows_active_distribution_type_idx'],
    ['mike_workflows_active_pack_idx', 'accelerate_workflows_active_pack_idx']
  ];
  entry text[];
begin
  foreach entry slice 1 in array renames loop
    if to_regclass(format('public.%I', entry[1])) is not null
       and to_regclass(format('public.%I', entry[2])) is null then
      execute format('alter index public.%I rename to %I', entry[1], entry[2]);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- RPCs
--
-- Recreated against the renamed tables, then the old signatures are dropped.
-- Bodies match backend/schema.sql exactly; change both together.
-- ---------------------------------------------------------------------------
create or replace function public.replace_accelerate_workflows(
  p_source_commit text,
  p_workflows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  reference_item jsonb;
  jurisdiction_values text[];
  workflow_uuid uuid;
begin
  if p_source_commit !~ '^[0-9a-f]{40}$' then
    raise exception 'invalid workflow catalog source commit';
  end if;
  if jsonb_typeof(p_workflows) <> 'array' then
    raise exception 'workflow catalog payload must be an array';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('accelerate_workflows', 0));
  update public.accelerate_workflows set active = false where active;

  for item in select value from jsonb_array_elements(p_workflows)
  loop
    jurisdiction_values := null;
    if jsonb_typeof(item->'jurisdictions') = 'array' then
      select array_agg(value)
        into jurisdiction_values
      from jsonb_array_elements_text(item->'jurisdictions');
    end if;

    insert into public.accelerate_workflows (
      workflow_key, distribution, version, title, description, type,
      prompt_md, columns_config, contributors, language, practice,
      jurisdictions, pack_key, pack_title, pack_description, pack_version,
      default_sort_order, quick_action_name, quick_action_prompt,
      document_upload, word_quick_action, word_quick_action_prompt,
      source_commit, content_hash, active, updated_at
    ) values (
      item->>'workflow_key',
      item->>'distribution',
      nullif(item->>'version', ''),
      item->>'title',
      nullif(item->>'description', ''),
      item->>'type',
      nullif(item->>'prompt_md', ''),
      case when jsonb_typeof(item->'columns_config') = 'array'
        then item->'columns_config' else null end,
      case when jsonb_typeof(item->'contributors') = 'array'
        then item->'contributors' else '[]'::jsonb end,
      nullif(item->>'language', ''),
      nullif(item->>'practice', ''),
      jurisdiction_values,
      nullif(item->>'pack_key', ''),
      nullif(item->>'pack_title', ''),
      nullif(item->>'pack_description', ''),
      nullif(item->>'pack_version', ''),
      nullif(item->>'default_sort_order', '')::integer,
      nullif(item->>'quick_action_name', ''),
      nullif(item->>'quick_action_prompt', ''),
      coalesce((item->>'document_upload')::boolean, false),
      coalesce((item->>'word_quick_action')::boolean, false),
      nullif(item->>'word_quick_action_prompt', ''),
      p_source_commit,
      item->>'content_hash',
      true,
      now()
    )
    on conflict (workflow_key, content_hash) do update set
      distribution = excluded.distribution,
      version = excluded.version,
      title = excluded.title,
      description = excluded.description,
      type = excluded.type,
      prompt_md = excluded.prompt_md,
      columns_config = excluded.columns_config,
      contributors = excluded.contributors,
      language = excluded.language,
      practice = excluded.practice,
      jurisdictions = excluded.jurisdictions,
      pack_key = excluded.pack_key,
      pack_title = excluded.pack_title,
      pack_description = excluded.pack_description,
      pack_version = excluded.pack_version,
      default_sort_order = excluded.default_sort_order,
      quick_action_name = excluded.quick_action_name,
      quick_action_prompt = excluded.quick_action_prompt,
      document_upload = excluded.document_upload,
      word_quick_action = excluded.word_quick_action,
      word_quick_action_prompt = excluded.word_quick_action_prompt,
      source_commit = excluded.source_commit,
      active = true,
      updated_at = now()
    returning id into workflow_uuid;

    delete from public.accelerate_workflow_reference_files
    where accelerate_workflow_id = workflow_uuid;

    if item ? 'reference_files' then
      if jsonb_typeof(item->'reference_files') <> 'array' then
        raise exception 'workflow reference_files must be an array';
      end if;
      for reference_item in
        select value from jsonb_array_elements(item->'reference_files')
      loop
        insert into public.accelerate_workflow_reference_files (
          accelerate_workflow_id, filename, file_type, storage_path,
          size_bytes, content_hash
        ) values (
          workflow_uuid,
          reference_item->>'filename',
          reference_item->>'file_type',
          reference_item->>'storage_path',
          nullif(reference_item->>'size_bytes', '')::integer,
          reference_item->>'content_hash'
        );
      end loop;
    end if;
  end loop;
end;
$$;

create or replace function public.install_missing_default_workflows(
  p_user_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  catalog_item public.accelerate_workflows%rowtype;
  workflow_uuid uuid;
  installed_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  for catalog_item in
    select catalog.*
    from public.accelerate_workflows catalog
    where catalog.active
      and catalog.distribution = 'default'
    order by catalog.default_sort_order nulls last, catalog.workflow_key
  loop
    if exists (
      select 1
      from public.default_workflow_installations installation
      where installation.user_id::text = p_user_id
        and installation.default_key = catalog_item.workflow_key
    ) then
      continue;
    end if;

    insert into public.workflows (
      user_id, title, type, prompt_md, columns_config,
      language, practice, jurisdictions
    ) values (
      p_user_id::uuid,
      catalog_item.title,
      catalog_item.type,
      catalog_item.prompt_md,
      catalog_item.columns_config,
      coalesce(nullif(catalog_item.language, ''), 'English'),
      coalesce(nullif(catalog_item.practice, ''), 'General Transactions'),
      coalesce(catalog_item.jurisdictions, array['General']::text[])
    )
    returning id into workflow_uuid;

    insert into public.default_workflow_installations (
      user_id, default_key, workflow_id
    ) values (
      p_user_id::uuid, catalog_item.workflow_key, workflow_uuid
    );

    if catalog_item.type = 'assistant'
       and catalog_item.quick_action_name is not null then
      insert into public.quick_actions (
        user_id, workflow_id, name, prompt, document_upload,
        enabled, sort_order, surface
      ) values (
        p_user_id::uuid,
        workflow_uuid,
        catalog_item.quick_action_name,
        coalesce(catalog_item.quick_action_prompt, ''),
        catalog_item.document_upload,
        true,
        coalesce(catalog_item.default_sort_order, installed_count),
        'app'
      );

      if catalog_item.word_quick_action then
        insert into public.quick_actions (
          user_id, workflow_id, name, prompt, document_upload,
          enabled, sort_order, surface
        ) values (
          p_user_id::uuid,
          workflow_uuid,
          catalog_item.quick_action_name,
          coalesce(
            catalog_item.word_quick_action_prompt,
            'Execute this workflow on this Word document.'
          ),
          false,
          true,
          coalesce(catalog_item.default_sort_order, installed_count),
          'word'
        );
      end if;
    end if;

    installed_count := installed_count + 1;
  end loop;

  return installed_count;
end;
$$;

create or replace function public.install_missing_default_workflows(
  p_user_id text,
  p_defaults jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  workflow_uuid uuid;
  installed_count integer := 0;
  jurisdiction_values text[];
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  for item in select value from jsonb_array_elements(coalesce(p_defaults, '[]'::jsonb))
  loop
    if nullif(trim(item->>'default_key'), '') is null then
      continue;
    end if;

    if exists (
      select 1
      from public.default_workflow_installations dwi
      where dwi.user_id::text = p_user_id
        and dwi.default_key = item->>'default_key'
    ) then
      continue;
    end if;

    select coalesce(array_agg(value), array['General']::text[])
      into jurisdiction_values
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(item->'jurisdictions') = 'array'
          then item->'jurisdictions'
        else '["General"]'::jsonb
      end
    );

    insert into public.workflows (
      user_id,
      title,
      type,
      prompt_md,
      columns_config,
      language,
      practice,
      jurisdictions
    ) values (
      p_user_id::uuid,
      item->>'title',
      item->>'type',
      nullif(item->>'prompt_md', ''),
      case
        when jsonb_typeof(item->'columns_config') = 'array'
          then item->'columns_config'
        else null
      end,
      coalesce(nullif(item->>'language', ''), 'English'),
      coalesce(nullif(item->>'practice', ''), 'General Transactions'),
      jurisdiction_values
    )
    returning id into workflow_uuid;

    insert into public.default_workflow_installations (
      user_id,
      default_key,
      workflow_id
    ) values (
      p_user_id::uuid,
      item->>'default_key',
      workflow_uuid
    );

    if item->>'type' = 'assistant' then
      insert into public.quick_actions (
        user_id,
        workflow_id,
        name,
        prompt,
        document_upload,
        enabled,
        sort_order,
        surface
      ) values (
        p_user_id::uuid,
        workflow_uuid,
        coalesce(nullif(trim(item->>'quick_action_name'), ''), item->>'title'),
        coalesce(item->>'quick_action_prompt', ''),
        coalesce((item->>'document_upload')::boolean, false),
        true,
        coalesce((item->>'sort_order')::integer, installed_count),
        'app'
      );

      if coalesce((item->>'word_quick_action')::boolean, false) then
        insert into public.quick_actions (
          user_id,
          workflow_id,
          name,
          prompt,
          document_upload,
          enabled,
          sort_order,
          surface
        ) values (
          p_user_id::uuid,
          workflow_uuid,
          coalesce(nullif(trim(item->>'quick_action_name'), ''), item->>'title'),
          coalesce(
            item->>'word_quick_action_prompt',
            'Execute this workflow on this Word document.'
          ),
          false,
          true,
          coalesce((item->>'sort_order')::integer, installed_count),
          'word'
        );
      end if;
    end if;

    installed_count := installed_count + 1;
  end loop;

  return installed_count;
end;
$$;

drop function if exists public.replace_mike_workflows(text, jsonb);

-- ---------------------------------------------------------------------------
-- Grants
--
-- Re-applied because renaming does not change ACLs but the drift check
-- compares them per object name, and a fresh install builds them from
-- schema.sql under the new names.
-- ---------------------------------------------------------------------------
revoke all on public.accelerate_workflows from anon, authenticated;
revoke all on public.accelerate_workflow_reference_files from anon, authenticated;

grant select, insert, update, delete
  on public.accelerate_workflows,
     public.accelerate_workflow_reference_files
  to service_role;

revoke all on function public.replace_accelerate_workflows(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.install_missing_default_workflows(text)
  from public, anon, authenticated;
revoke all on function public.install_missing_default_workflows(text, jsonb)
  from public, anon, authenticated;

grant execute
  on function public.replace_accelerate_workflows(text, jsonb)
  to service_role;
grant execute
  on function public.install_missing_default_workflows(text)
  to service_role;
grant execute
  on function public.install_missing_default_workflows(text, jsonb)
  to service_role;
