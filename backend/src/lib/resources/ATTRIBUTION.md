# Legal AI resources — attribution

`legalAiResources.json` is generated from
[CSHaitao/Awesome-LegalAI-Resources](https://github.com/CSHaitao/Awesome-LegalAI-Resources),
a curated list of legal-AI datasets, benchmarks, and research sites.

The upstream repository is MIT licensed and asks that reusers link back to it.
That link is shown on the in-app Resources page and must stay there.

Descriptions are taken from the upstream list, lightly normalized (whitespace
collapsed, the `**Language**` / `**Country**` metadata lines parsed into
`languages` and `jurisdictions`). Nothing is rewritten, so the text remains
attributable to the upstream authors.

Regenerate with:

```bash
node scripts/import-legal-ai-resources.mjs
```

`jurisdictions` for the `website` records are not present upstream — they are
assigned by the importer from each site's coverage, so the research surface can
offer jurisdiction-matched sources. See `SITE_JURISDICTIONS` in the script.
