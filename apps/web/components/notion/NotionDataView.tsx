"use client";

import { memo, useCallback, useState } from "react";
import { useNotionData } from "@/hooks/useNotionData";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { NotionPage, NotionDatabase } from "@/types/notion";

function NotionDataViewComponent() {
  const { data, loading, error, query, reset } = useNotionData();
  const [searchInput, setSearchInput] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) return;
    setActiveAction("search_pages");
    await query({ action: "search_pages", params: { query: searchInput } });
  }, [searchInput, query]);

  const handleListPages = useCallback(async () => {
    setActiveAction("list_pages");
    await query({ action: "list_pages" });
  }, [query]);

  const handleListDatabases = useCallback(async () => {
    setActiveAction("list_databases");
    await query({ action: "list_databases" });
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search your Notion pages..."
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !searchInput.trim()}
          className="bg-white text-black font-medium text-sm px-5 py-3 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto"
        >
          Search
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleListPages}
          disabled={loading}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            activeAction === "list_pages"
              ? "bg-white text-black border-white"
              : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
          } disabled:opacity-40`}
        >
          Pages
        </button>
        <button
          onClick={handleListDatabases}
          disabled={loading}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            activeAction === "list_databases"
              ? "bg-white text-black border-white"
              : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
          } disabled:opacity-40`}
        >
          Databases
        </button>
        {data && (
          <button
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-400 transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <ErrorBanner
          code={error.code}
          message={error.message}
          retryable={error.retryable}
          onRetry={
            activeAction
              ? () =>
                  query({
                    action: activeAction as "search_pages" | "list_pages" | "list_databases",
                    params:
                      activeAction === "search_pages"
                        ? { query: searchInput }
                        : undefined,
                  })
              : undefined
          }
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12">
          <LoadingSpinner size="md" label="Fetching from Notion..." />
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <div className="flex flex-col gap-3">
          {/* Pages */}
          {data.pages && data.pages.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Pages
              </h3>
              {data.pages.map((page: NotionPage) => (
                <a
                  key={page.id}
                  href={page.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors"
                >
                  <span className="text-lg shrink-0">{page.icon ?? "Document"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate group-hover:text-neutral-200">
                      {page.title || "Untitled"}
                    </p>
                    {page.last_edited && (
                      <p className="text-xs text-neutral-600">
                        Edited {new Date(page.last_edited).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors text-xs">
                    {"↗"}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Databases */}
          {data.databases && data.databases.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Databases
              </h3>
              {data.databases.map((db: NotionDatabase) => (
                <a
                  key={db.id}
                  href={db.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors"
                >
                  <span className="text-lg shrink-0">{db.icon ?? "Database"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {db.title || "Untitled"}
                    </p>
                    {db.description && (
                      <p className="text-xs text-neutral-600 truncate">{db.description}</p>
                    )}
                  </div>
                  <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors text-xs">
                    {"↗"}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Empty State */}
          {(!data.pages || data.pages.length === 0) &&
            (!data.databases || data.databases.length === 0) &&
            !data.raw && (
              <div className="py-12 text-center">
                <p className="text-sm text-neutral-500">
                  No results found. Try a different search.
                </p>
              </div>
            )}

          {/* Raw fallback */}
          {data.raw && !data.pages?.length && !data.databases?.length && (
            <pre className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-400 overflow-x-auto max-h-80">
              {JSON.stringify(data.raw, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Empty initial state */}
      {!loading && !data && !error && (
        <div className="py-16 text-center">
          <div className="text-3xl mb-3 opacity-20">*</div>
          <p className="text-sm text-neutral-600">Search or browse your Notion workspace</p>
        </div>
      )}
    </div>
  );
}

export const NotionDataView = memo(NotionDataViewComponent);
