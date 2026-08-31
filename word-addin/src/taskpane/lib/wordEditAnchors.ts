/// <reference types="office-js" />

/**
 * Document-local registry for durable Word edit anchors.
 *
 * The stable edit ID comes from the persisted assistant-message UUID plus the
 * redline block index. The bookmark itself lives in Word; this setting tells a
 * reloaded task pane which bookmark belongs to which historical edit card.
 */
const WORD_EDIT_ANCHORS_SETTING = "accelerate.wordEditAnchors.v1";
/**
 * The pre-rename key. Registries written before the rename are embedded in
 * documents already in the wild, so reads accept it and the next write moves
 * the document onto the current key. See the prefix note on
 * `bookmarkNameForEdit` for the matching bookmark-name treatment.
 */
const LEGACY_WORD_EDIT_ANCHORS_SETTING = "mike.wordEditAnchors.v1";

interface WordEditAnchor {
  bookmarkName: string;
  createdAt: string;
}

interface PersistedWordEditAnchorRegistry {
  version: 1;
  anchors: Record<string, WordEditAnchor>;
}

const EMPTY_REGISTRY: PersistedWordEditAnchorRegistry = {
  version: 1,
  anchors: {},
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRegistry(
  settings: Office.Settings
): PersistedWordEditAnchorRegistry {
  const stored = settings.get(WORD_EDIT_ANCHORS_SETTING) as unknown;
  const value =
    stored === null || stored === undefined
      ? (settings.get(LEGACY_WORD_EDIT_ANCHORS_SETTING) as unknown)
      : stored;
  if (!isPlainObject(value) || value.version !== 1 || !isPlainObject(value.anchors)) {
    return { ...EMPTY_REGISTRY, anchors: {} };
  }

  const anchors: Record<string, WordEditAnchor> = {};
  for (const [stableEditId, candidate] of Object.entries(value.anchors)) {
    if (
      isPlainObject(candidate) &&
      typeof candidate.bookmarkName === "string" &&
      bookmarkNameMatchesEdit(candidate.bookmarkName, stableEditId) &&
      typeof candidate.createdAt === "string"
    ) {
      anchors[stableEditId] = {
        bookmarkName: candidate.bookmarkName,
        createdAt: candidate.createdAt,
      };
    }
  }
  return { version: 1, anchors };
}

function saveSettings(settings: Office.Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    settings.saveAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve();
        return;
      }
      reject(new Error(result.error?.message || "Word could not save edit anchors."));
    });
  });
}

/** A compact deterministic digest using two independent 32-bit FNV-1a passes. */
function stableDigest(value: string): string {
  const hash = (seed: number): string => {
    let result = seed >>> 0;
    for (let index = 0; index < value.length; index++) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 0x01000193) >>> 0;
    }
    return result.toString(16).padStart(8, "0");
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}`;
}

/**
 * Word bookmark names are limited to 40 alphanumeric/underscore characters.
 * Leading `_` makes this an invisible bookmark in Word's normal bookmark UI.
 *
 * These names are written into the user's .docx, so the pre-rename prefix has
 * to stay resolvable: documents annotated before the rename carry it, and a
 * bookmark we cannot find is an edit we cannot re-anchor. New bookmarks use the
 * current prefix; `bookmarkNamesForEdit` returns both, current one first, for
 * every lookup path.
 *
 * The registry is the primary lookup and lives in Office document settings,
 * which travel inside the .docx — so a document annotated before the rename
 * still resolves through `readRegistry`, which accepts either prefix. Only the
 * deterministic fallback used when settings are unavailable is prefix-specific,
 * and that path was already a degraded re-anchor.
 */
const BOOKMARK_PREFIX = "_AxEdit_";
const LEGACY_BOOKMARK_PREFIX = "_MikeEdit_";

export function bookmarkNameForEdit(stableEditId: string): string {
  return `${BOOKMARK_PREFIX}${stableDigest(stableEditId)}`;
}

/** Every bookmark name that may anchor this edit, newest convention first. */
export function bookmarkNamesForEdit(stableEditId: string): string[] {
  const digest = stableDigest(stableEditId);
  return [
    `${BOOKMARK_PREFIX}${digest}`,
    `${LEGACY_BOOKMARK_PREFIX}${digest}`,
  ];
}

/** True when `bookmarkName` anchors `stableEditId` under either convention. */
export function bookmarkNameMatchesEdit(
  bookmarkName: string,
  stableEditId: string,
): boolean {
  return bookmarkNamesForEdit(stableEditId).includes(bookmarkName);
}

/**
 * Drop the entire anchor registry from the settings working copy WITHOUT
 * saving. Used when copy detection mints a fresh document identity: the
 * registry keys reference the original document's chat history, so it is
 * stale in the copy. The caller batches this into its own saveAsync.
 */
export function clearWordEditAnchorRegistry(settings: Office.Settings): void {
  settings.remove(WORD_EDIT_ANCHORS_SETTING);
  settings.remove(LEGACY_WORD_EDIT_ANCHORS_SETTING);
}

export function getWordEditAnchor(stableEditId: string): WordEditAnchor | null {
  const settings = Office.context.document.settings;
  const anchor = readRegistry(settings).anchors[stableEditId];
  return anchor ? { ...anchor } : null;
}

/**
 * Registered stable edit IDs starting with `prefix`. A replace-all edit
 * persists one anchor per applied occurrence under `${cardKey}#${pass}`, and
 * this is how a reloaded pane discovers how many passes were applied.
 */
export function listWordEditAnchorIds(prefix: string): string[] {
  const settings = Office.context.document.settings;
  return Object.keys(readRegistry(settings).anchors).filter((id) =>
    id.startsWith(prefix),
  );
}

export async function persistWordEditAnchor(
  stableEditId: string,
  bookmarkName: string
): Promise<void> {
  if (!bookmarkNameMatchesEdit(bookmarkName, stableEditId)) {
    throw new Error("Word edit anchor name does not match its stable edit ID.");
  }
  const settings = Office.context.document.settings;
  const registry = readRegistry(settings);
  registry.anchors[stableEditId] = {
    bookmarkName,
    createdAt: new Date().toISOString(),
  };
  settings.set(WORD_EDIT_ANCHORS_SETTING, registry);
  await saveSettings(settings);
}

export async function removeWordEditAnchor(stableEditId: string): Promise<void> {
  const settings = Office.context.document.settings;
  const rawStored = settings.get(WORD_EDIT_ANCHORS_SETTING) as unknown;
  const rawRegistry =
    rawStored === null || rawStored === undefined
      ? (settings.get(LEGACY_WORD_EDIT_ANCHORS_SETTING) as unknown)
      : rawStored;
  const rawContainsAnchor =
    isPlainObject(rawRegistry) &&
    isPlainObject(rawRegistry.anchors) &&
    Object.prototype.hasOwnProperty.call(rawRegistry.anchors, stableEditId);
  const registry = readRegistry(settings);
  if (!registry.anchors[stableEditId] && !rawContainsAnchor) return;

  delete registry.anchors[stableEditId];
  if (Object.keys(registry.anchors).length === 0) {
    settings.remove(WORD_EDIT_ANCHORS_SETTING);
  settings.remove(LEGACY_WORD_EDIT_ANCHORS_SETTING);
  } else {
    settings.set(WORD_EDIT_ANCHORS_SETTING, registry);
  }
  await saveSettings(settings);
}
