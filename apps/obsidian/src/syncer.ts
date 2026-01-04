import {
  App,
  Notice,
  TFile,
  debounce,
  getAllTags,
  requestUrl,
} from "obsidian";
import {
  buildExternalId,
  createPathFilter,
  obsidianScopeResponseSchema,
  type SyncBatchResponse,
  type SyncItem,
} from "@daily-brain-bits/integrations-obsidian";
import { normalizeForHash, sha256Hex } from "@daily-brain-bits/core";
import type { DBBSettings } from "./settings";
import type { LocalIndex, PendingQueueItem, SyncStatus } from "./types";

const maxBackoffMs = 60_000;

function buildApiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return `${trimmed}${path}`;
}

function parseRetryAfter(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return null;
}

function toQueueKey(item: PendingQueueItem): string {
  return `${item.op}:${item.externalId}:${item.path}`;
}

function normalizePatterns(patterns: string[]): string[] {
  return patterns.map((pattern) => pattern.trim()).filter(Boolean);
}

function buildScopeFilter(
  patterns: string[],
  scopeReady: boolean
): (path: string) => boolean {
  if (!scopeReady) {
    return () => false;
  }
  if (patterns.length === 0) {
    return () => true;
  }
  return createPathFilter({ include: patterns });
}

function pickFrontmatter(frontmatter?: Record<string, unknown>) {
  if (!frontmatter) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === "position") {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const filtered = value.filter(
        (entry) =>
          typeof entry === "string" ||
          typeof entry === "number" ||
          typeof entry === "boolean"
      );
      if (filtered.length > 0) {
        result[key] = filtered;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function extractAliases(frontmatter?: Record<string, unknown>): string[] {
  const raw = frontmatter?.aliases ?? frontmatter?.alias;
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((item) => typeof item === "string") as string[];
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return [];
}

function shouldSyncFile(
  file: TFile,
  filter: (path: string) => boolean
): boolean {
  if (!filter(file.path)) {
    return false;
  }
  return file.extension === "md";
}

export class Syncer {
  private app: App;
  private settings: DBBSettings;
  private index: LocalIndex;
  private saveData: () => Promise<void>;
  private status: SyncStatus;
  private isSyncing = false;
  private backoffMs = 1_000;
  private pathFilter: (path: string) => boolean;
  private flushDebounced: () => void;
  private scopePatterns: string[] = [];
  private scopeReady = false;
  private scopeUpdatedAt: string | null = null;

  constructor(
    app: App,
    settings: DBBSettings,
    index: LocalIndex,
    saveData: () => Promise<void>
  ) {
    this.app = app;
    this.settings = settings;
    this.index = index;
    this.saveData = saveData;
    this.status = {
      lastSyncAt: null,
      lastError: null,
      lastResult: null,
    };
    this.pathFilter = buildScopeFilter(this.scopePatterns, this.scopeReady);
    this.flushDebounced = debounce(
      () => void this.flushQueue(),
      settings.debounceMs,
      true
    );
  }

  updateSettings(settings: DBBSettings) {
    const scopeReset =
      this.settings.apiBaseUrl !== settings.apiBaseUrl ||
      this.settings.vaultId !== settings.vaultId;
    this.settings = settings;
    if (scopeReset) {
      this.scopeReady = false;
      this.scopePatterns = [];
    }
    this.pathFilter = buildScopeFilter(this.scopePatterns, this.scopeReady);
    this.flushDebounced = debounce(
      () => void this.flushQueue(),
      settings.debounceMs,
      true
    );
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getScopeStatus() {
    return {
      ready: this.scopeReady,
      patterns: [...this.scopePatterns],
      updatedAt: this.scopeUpdatedAt,
    };
  }

  async refreshScope(options: { triggerSync?: boolean } = {}): Promise<boolean> {
    const triggerSync = options.triggerSync ?? true;
    const scope = await this.fetchScopePatterns();
    if (!scope) {
      return false;
    }
    const normalized = normalizePatterns(scope.patterns);
    const changed = this.applyScope(normalized, scope.updatedAt);
    this.status.lastError = null;
    if (changed && triggerSync) {
      void this.fullSync();
    }
    return true;
  }

  enqueueUpsert(file: TFile) {
    if (!shouldSyncFile(file, this.pathFilter)) {
      return;
    }
    const externalId = buildExternalId(this.settings.vaultId, file.path);
    this.enqueue({
      op: "upsert",
      externalId,
      path: file.path,
      lastSeenMtime: file.stat.mtime,
    });
  }

  enqueueDelete(path: string) {
    const externalId = buildExternalId(this.settings.vaultId, path);
    this.enqueue({
      op: "delete",
      externalId,
      path,
    });
  }

  onCreate(file: TFile) {
    this.enqueueUpsert(file);
  }

  onModify(file: TFile) {
    this.enqueueUpsert(file);
  }

  onDelete(path: string) {
    this.enqueueDelete(path);
  }

  onRename(file: TFile, oldPath: string) {
    this.enqueueDelete(oldPath);
    this.enqueueUpsert(file);
  }

  async fullSync() {
    if (!this.scopeReady) {
      const refreshed = await this.refreshScope({ triggerSync: false });
      if (!refreshed) {
        return;
      }
    }
    const files = this.app.vault.getMarkdownFiles();
    const now = new Date().toISOString();

    for (const file of files) {
      if (!shouldSyncFile(file, this.pathFilter)) {
        continue;
      }
      const externalId = buildExternalId(this.settings.vaultId, file.path);
      const entry = this.index.files[externalId];
      if (entry?.lastSeenMtime === file.stat.mtime) {
        continue;
      }
      this.enqueue({
        op: "upsert",
        externalId,
        path: file.path,
        lastSeenMtime: file.stat.mtime,
      });
    }

    this.index.lastFullScanAt = now;
    await this.saveData();
    this.flushDebounced();
  }

  async flushQueue() {
    if (this.isSyncing) {
      return;
    }
    if (this.index.pendingQueue.length === 0) {
      return;
    }
    if (!this.settings.apiBaseUrl || !this.settings.vaultId) {
      new Notice("Daily Brain Bits: missing API base URL or Vault ID.");
      return;
    }

    this.isSyncing = true;

    try {
      const batch = await this.buildBatch();
      this.dropQueueItems(batch.skippedKeys);
      if (batch.items.length === 0) {
        this.isSyncing = false;
        return;
      }

      const response = await this.sendBatch(batch.items);

      if (!response) {
        this.isSyncing = false;
        return;
      }

      this.applyBatchResult(batch, response);
      await this.saveData();

      if (this.index.pendingQueue.length > 0) {
        this.flushDebounced();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private enqueue(item: PendingQueueItem) {
    const key = toQueueKey(item);
    const existing = new Set(
      this.index.pendingQueue.map((entry) => toQueueKey(entry))
    );
    if (existing.has(key)) {
      return;
    }
    this.index.pendingQueue.push(item);
    void this.saveData();
    this.flushDebounced();
  }

  private applyScope(patterns: string[], updatedAt?: string): boolean {
    const previous = this.scopePatterns.join("\n");
    const next = patterns.join("\n");
    const changed = previous !== next;

    this.scopePatterns = patterns;
    this.scopeReady = true;
    this.scopeUpdatedAt = updatedAt ?? new Date().toISOString();
    this.pathFilter = buildScopeFilter(patterns, true);

    if (changed) {
      for (const entry of Object.values(this.index.files)) {
        if (!this.pathFilter(entry.path)) {
          this.enqueueDelete(entry.path);
        }
      }
    }

    return changed;
  }

  private async fetchScopePatterns(): Promise<{
    patterns: string[];
    updatedAt?: string;
  } | null> {
    if (!this.settings.apiBaseUrl || !this.settings.vaultId) {
      this.status.lastError = "Missing API base URL or Vault ID.";
      return null;
    }

    try {
      const response = await requestUrl({
        url: buildApiUrl(
          this.settings.apiBaseUrl,
          `/v1/integrations/obsidian/scope?vaultId=${encodeURIComponent(
            this.settings.vaultId
          )}`
        ),
        method: "GET",
        headers: {
          ...(this.settings.pluginToken
            ? { Authorization: `Bearer ${this.settings.pluginToken}` }
            : {}),
        },
      });

      if (response.status === 401) {
        this.status.lastError = "Unauthorized - check plugin token.";
        new Notice("Daily Brain Bits: token invalid. Reconnect.");
        return null;
      }

      if (response.status === 404) {
        this.status.lastError = "Vault not registered with backend.";
        return null;
      }

      if (response.status < 200 || response.status >= 300) {
        this.status.lastError = `Scope fetch failed (${response.status}).`;
        return null;
      }

      const data =
        typeof response.json === "object" && response.json !== null
          ? response.json
          : JSON.parse(response.text);
      const parsed = obsidianScopeResponseSchema.safeParse(data);
      if (!parsed.success) {
        this.status.lastError = "Invalid scope response.";
        return null;
      }

      return {
        patterns: parsed.data.patterns,
        updatedAt: parsed.data.updatedAt,
      };
    } catch (error) {
      console.error("DBB scope fetch failed", error);
      this.status.lastError = "Failed to refresh scope.";
      return null;
    }
  }

  private async buildBatch(): Promise<{
    items: SyncItem[];
    queueItems: PendingQueueItem[];
    itemMap: Map<string, SyncItem>;
    skippedKeys: Set<string>;
  }> {
    const items: SyncItem[] = [];
    const queueItems: PendingQueueItem[] = [];
    const itemMap = new Map<string, SyncItem>();
    const skippedKeys = new Set<string>();
    let batchBytes = 0;

    for (const queued of this.index.pendingQueue) {
      if (queueItems.length >= this.settings.batchSize) {
        break;
      }

      const built = await this.buildSyncItem(queued);
      if (!built) {
        skippedKeys.add(toQueueKey(queued));
        continue;
      }

      const projectedBytes = Buffer.byteLength(JSON.stringify(built), "utf8");
      const wouldOverflow =
        items.length > 0 &&
        projectedBytes + batchBytes > this.settings.maxBytesPerBatch;

      if (wouldOverflow) {
        break;
      }

      items.push(built);
      queueItems.push(queued);
      itemMap.set(built.externalId, built);
      batchBytes += projectedBytes;
    }

    return { items, queueItems, itemMap, skippedKeys };
  }

  private async buildSyncItem(
    queued: PendingQueueItem
  ): Promise<SyncItem | null> {
    if (queued.op === "delete") {
      return {
        op: "delete",
        externalId: queued.externalId,
        deletedAtSource: new Date().toISOString(),
        metadata: {
          path: queued.path,
        },
      };
    }

    const file = this.app.vault.getAbstractFileByPath(queued.path);
    if (!(file instanceof TFile)) {
      return {
        op: "delete",
        externalId: queued.externalId,
        deletedAtSource: new Date().toISOString(),
        metadata: {
          path: queued.path,
        },
      };
    }

    if (!shouldSyncFile(file, this.pathFilter)) {
      return null;
    }

    const content = await this.app.vault.cachedRead(file);
    const contentHash = sha256Hex(normalizeForHash(content));
    const existing = this.index.files[queued.externalId];

    if (existing && existing.contentHash === contentHash) {
      existing.lastSeenMtime = file.stat.mtime;
      await this.saveData();
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = pickFrontmatter(cache?.frontmatter);
    const tags = cache ? getAllTags(cache) : [];
    const aliases = extractAliases(cache?.frontmatter);
    const links = cache?.links?.map((link) => link.link) ?? [];
    const title =
      typeof cache?.frontmatter?.title === "string"
        ? cache.frontmatter.title
        : file.basename;

    return {
      op: "upsert",
      externalId: queued.externalId,
      title,
      contentMarkdown: content,
      contentHash,
      updatedAtSource: new Date(file.stat.mtime).toISOString(),
      metadata: {
        path: file.path,
        tags,
        aliases,
        links,
        frontmatter,
      },
    };
  }

  private async sendBatch(items: SyncItem[]): Promise<SyncBatchResponse | null> {
    const payload = {
      vaultId: this.settings.vaultId,
      deviceId: this.settings.deviceId,
      sentAt: new Date().toISOString(),
      items,
    };

    try {
      const response = await requestUrl({
        url: buildApiUrl(
          this.settings.apiBaseUrl,
          "/v1/integrations/obsidian/sync/batch"
        ),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.settings.pluginToken
            ? { Authorization: `Bearer ${this.settings.pluginToken}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        this.status.lastError = "Unauthorized - check plugin token.";
        new Notice("Daily Brain Bits: token invalid. Reconnect.");
        return null;
      }

      if (response.status === 429 || response.status === 503) {
        const retryAfter = parseRetryAfter(
          response.headers?.["retry-after"] ?? response.headers?.["Retry-After"]
        );
        const backoff = retryAfter ?? Math.min(this.backoffMs * 2, maxBackoffMs);
        this.backoffMs = backoff;
        this.status.lastError = "Rate limited - retrying soon.";
        window.setTimeout(() => this.flushDebounced(), backoff);
        return null;
      }

      if (response.status < 200 || response.status >= 300) {
        this.status.lastError = `Sync failed (${response.status}).`;
        return null;
      }

      this.backoffMs = 1_000;
      const data =
        typeof response.json === "object" && response.json !== null
          ? (response.json as SyncBatchResponse)
          : (JSON.parse(response.text) as SyncBatchResponse);
      return data;
    } catch (error) {
      this.status.lastError = "Network error - retrying soon.";
      this.backoffMs = Math.min(this.backoffMs * 2, maxBackoffMs);
      window.setTimeout(() => this.flushDebounced(), this.backoffMs);
      console.error("DBB sync failed", error);
      return null;
    }
  }

  private applyBatchResult(
    batch: {
      items: SyncItem[];
      queueItems: PendingQueueItem[];
      itemMap: Map<string, SyncItem>;
    },
    response: SyncBatchResponse
  ) {
    const queueKeys = new Set(batch.queueItems.map((item) => toQueueKey(item)));
    this.index.pendingQueue = this.index.pendingQueue.filter(
      (item) => !queueKeys.has(toQueueKey(item))
    );

    const queueByExternalId = new Map(
      batch.queueItems.map((item) => [item.externalId, item])
    );

    for (const result of response.itemResults) {
      const item = batch.itemMap.get(result.externalId);
      const queued = queueByExternalId.get(result.externalId);

      if (!item || result.status !== "accepted") {
        continue;
      }

      if (item.op === "delete") {
        delete this.index.files[item.externalId];
        continue;
      }

      const path =
        item.metadata && typeof item.metadata.path === "string"
          ? item.metadata.path
          : queued?.path;
      if (!path) {
        continue;
      }

      this.index.files[item.externalId] = {
        path,
        contentHash: item.contentHash,
        lastSyncedAt: new Date().toISOString(),
        lastSeenMtime: queued?.lastSeenMtime ?? null,
      };
    }

    this.status.lastSyncAt = new Date().toISOString();
    this.status.lastResult = {
      accepted: response.accepted,
      rejected: response.rejected,
    };
    this.status.lastError = null;
  }

  private dropQueueItems(keys: Set<string>) {
    if (keys.size === 0) {
      return;
    }
    this.index.pendingQueue = this.index.pendingQueue.filter(
      (item) => !keys.has(toQueueKey(item))
    );
  }
}
