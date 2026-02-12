import { writable, derived, get } from 'svelte/store';
import { getAllFiles, putFile, deleteFile as dbDeleteFile } from '../db.js';
import { inputJson, expression } from './transformerStore.js';

const ACTIVE_FILE_KEY = 'mapql-active-file-id';

const DEFAULT_INPUT_JSON = `{
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 32,
    "email": "john@example.com",
    "address": {
      "city": "New York",
      "country": "USA"
    }
  },
  "orders": [
    { "id": 1, "product": "Widget", "price": 25.99, "quantity": 2, "status": "shipped" },
    { "id": 2, "product": "Gadget", "price": 49.99, "quantity": 1, "status": "pending" },
    { "id": 3, "product": "Gizmo", "price": 15.00, "quantity": 5, "status": "shipped" }
  ],
  "tags": ["electronics", "sale", "featured"]
}`;

const DEFAULT_EXPRESSION = `{
  fullName: \`\${user.firstName} \${user.lastName}\`,
  location: \`\${user.address.city}, \${user.address.country}\`,

  // Filter with auto-projection (no need for [] after filter)
  shippedProducts: orders[? status === "shipped"].product,

  // Piped helpers: filter() and map()
  shippedProducts2: orders | filter(o => o.status === "shipped") | map(o => o.product),

  // Native JS methods
  shippedProducts3: orders.filter(o => o.status === "shipped").map(o => o.product),

  // Pipe with aggregation helpers
  orderCount: orders | count,
  allProducts: orders[].product | join(", "),
  totalValue: orders | map(o => o.price * o.quantity) | sum
}`;

/** @type {import('svelte/store').Writable<import('../db.js').PlaygroundFile[]>} */
export const files = writable([]);
export const activeFileId = writable(/** @type {string|null} */ (null));
export const filesLoaded = writable(false);

export const activeFile = derived([files, activeFileId], ([$files, $activeFileId]) => {
  return $files.find((f) => f.id === $activeFileId) || null;
});

// --- Auto-save ---
let _pauseAutoSave = false;
let _autoSaveTimer = null;
let _lastSavedJson = '';
let _lastSavedExpr = '';

function startAutoSave() {
  // Subscribe to both stores and debounce saves
  const unsubs = [inputJson.subscribe(scheduleAutoSave), expression.subscribe(scheduleAutoSave)];
  return () => unsubs.forEach((u) => u());
}

function scheduleAutoSave() {
  if (_pauseAutoSave) return;
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(flushAutoSave, 500);
}

function flushAutoSave() {
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = null;
  }
  if (_pauseAutoSave) return;

  const id = get(activeFileId);
  if (!id) return;

  const json = get(inputJson);
  const expr = get(expression);

  // Skip if nothing changed
  if (json === _lastSavedJson && expr === _lastSavedExpr) return;

  _lastSavedJson = json;
  _lastSavedExpr = expr;

  const $files = get(files);
  const idx = $files.findIndex((f) => f.id === id);
  if (idx === -1) return;

  const now = Date.now();
  const updated = { ...$files[idx], inputJson: json, expression: expr, updatedAt: now };

  // Update in-memory
  const next = [...$files];
  next[idx] = updated;
  files.set(next);

  // Persist
  putFile(updated);
}

// --- Public API ---

/** Initialize file system: load from IndexedDB or create default */
export async function initFiles() {
  let stored = await getAllFiles();

  if (stored.length === 0) {
    // First visit — create default file with current editor content
    const defaultFile = createFileObject('Untitled 1', get(inputJson), get(expression), 0);
    await putFile(defaultFile);
    stored = [defaultFile];
  }

  files.set(stored);

  // Restore active file from localStorage
  let savedActiveId = null;
  try {
    savedActiveId = localStorage.getItem(ACTIVE_FILE_KEY);
  } catch (e) {
    console.error('Failed to read active file from localStorage:', e);
  }

  const activeExists = stored.some((f) => f.id === savedActiveId);
  const targetId = activeExists ? savedActiveId : stored[0].id;

  // Load content into editor stores
  const target = stored.find((f) => f.id === targetId);
  _pauseAutoSave = true;
  inputJson.set(target.inputJson);
  expression.set(target.expression);
  _lastSavedJson = target.inputJson;
  _lastSavedExpr = target.expression;
  _pauseAutoSave = false;

  activeFileId.set(targetId);
  persistActiveId(targetId);

  startAutoSave();
  filesLoaded.set(true);
}

/** Switch to a different file */
export function switchFile(id) {
  const currentId = get(activeFileId);
  if (id === currentId) return;

  // Force-save current file before switching
  flushAutoSave();

  const $files = get(files);
  const target = $files.find((f) => f.id === id);
  if (!target) return;

  // Pause auto-save to prevent writing new content back to old file
  _pauseAutoSave = true;
  inputJson.set(target.inputJson);
  expression.set(target.expression);
  _lastSavedJson = target.inputJson;
  _lastSavedExpr = target.expression;
  _pauseAutoSave = false;

  activeFileId.set(id);
  persistActiveId(id);
}

/** Create a new empty file and switch to it */
export async function createFile() {
  flushAutoSave();

  const $files = get(files);
  const name = nextUntitledName($files);
  const maxOrder = $files.reduce((m, f) => Math.max(m, f.order), 0);
  const file = createFileObject(name, '', '', maxOrder + 1);

  await putFile(file);
  files.update((f) => [...f, file]);

  switchFile(file.id);
}

/** Duplicate an existing file and switch to the copy */
export async function duplicateFile(id) {
  flushAutoSave();

  const $files = get(files);
  const source = $files.find((f) => f.id === id);
  if (!source) return;

  // If duplicating the active file, grab latest editor content
  const isActive = id === get(activeFileId);
  const json = isActive ? get(inputJson) : source.inputJson;
  const expr = isActive ? get(expression) : source.expression;

  const maxOrder = $files.reduce((m, f) => Math.max(m, f.order), 0);
  const file = createFileObject(source.name + ' (copy)', json, expr, maxOrder + 1);

  await putFile(file);
  files.update((f) => [...f, file]);

  switchFile(file.id);
}

/** Rename a file */
export async function renameFile(id, name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  files.update(($files) => {
    const idx = $files.findIndex((f) => f.id === id);
    if (idx === -1) return $files;

    const next = [...$files];
    next[idx] = { ...next[idx], name: trimmed, updatedAt: Date.now() };
    putFile(next[idx]);
    return next;
  });
}

/** Delete a file. Refuses if it's the last one. Returns true if deleted. */
export async function deleteFileById(id) {
  const $files = get(files);
  if ($files.length <= 1) return false;

  const idx = $files.findIndex((f) => f.id === id);
  if (idx === -1) return false;

  await dbDeleteFile(id);

  const next = $files.filter((f) => f.id !== id);
  files.set(next);

  // If we deleted the active file, switch to the nearest neighbor
  if (get(activeFileId) === id) {
    const newIdx = Math.min(idx, next.length - 1);
    switchFile(next[newIdx].id);
  }

  return true;
}

/** Load sample data into the active file */
export function loadSample() {
  inputJson.set(DEFAULT_INPUT_JSON);
  expression.set(DEFAULT_EXPRESSION);
}

/** Check if a file has no meaningful content (empty or whitespace-only) */
export function isFileEmpty(id) {
  // If it's the active file, check live editor content
  if (id === get(activeFileId)) {
    return !get(inputJson).trim() && !get(expression).trim();
  }
  const $files = get(files);
  const file = $files.find((f) => f.id === id);
  if (!file) return true;
  return !file.inputJson.trim() && !file.expression.trim();
}

/** Reorder: move file from one index to another */
export async function reorderFiles(fromId, toId) {
  if (fromId === toId) return;
  const $files = get(files);
  const fromIdx = $files.findIndex((f) => f.id === fromId);
  const toIdx = $files.findIndex((f) => f.id === toId);
  if (fromIdx === -1 || toIdx === -1) return;

  const next = [...$files];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);

  // Reassign order values and persist
  for (let i = 0; i < next.length; i++) {
    next[i] = { ...next[i], order: i };
    putFile(next[i]);
  }
  files.set(next);
}

// --- Helpers ---

function createFileObject(name, json, expr, order) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    inputJson: json,
    expression: expr,
    createdAt: now,
    updatedAt: now,
    order,
  };
}

function nextUntitledName(fileList) {
  const existing = new Set(fileList.map((f) => f.name));
  let n = 1;
  while (existing.has(`Untitled ${n}`)) n++;
  return `Untitled ${n}`;
}

function persistActiveId(id) {
  try {
    localStorage.setItem(ACTIVE_FILE_KEY, id);
  } catch (e) {
    console.error('Failed to persist active file ID:', e);
  }
}
