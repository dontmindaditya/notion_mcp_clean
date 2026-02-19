(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/lib/api-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiClientError",
    ()=>ApiClientError,
    "apiClient",
    ()=>apiClient
]);
class ApiClientError extends Error {
    code;
    retryable;
    constructor(apiError){
        super(apiError.message);
        this.name = "ApiClientError";
        this.code = apiError.code;
        this.retryable = apiError.retryable;
    }
}
async function request(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });
    // Handle non-JSON responses
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
        if (!res.ok) {
            throw new ApiClientError({
                code: "internal_error",
                message: `Request failed with status ${res.status}`,
                retryable: res.status >= 500
            });
        }
        return {};
    }
    const body = await res.json();
    if ("error" in body) {
        throw new ApiClientError(body.error);
    }
    return body.data;
}
const apiClient = {
    get (url) {
        return request(url, {
            method: "GET"
        });
    },
    post (url, data) {
        return request(url, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined
        });
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/hooks/useNotionConnection.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNotionConnection",
    ()=>useNotionConnection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/api-client.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function useNotionConnection() {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("loading");
    const [workspaceName, setWorkspaceName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [connectedAt, setConnectedAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const mountedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    const fetchStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useNotionConnection.useCallback[fetchStatus]": async ()=>{
            if (!mountedRef.current) return;
            setState("loading");
            setError(null);
            try {
                const status = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/notion/status");
                if (!mountedRef.current) return;
                if (status.connected && status.status === "active") {
                    setState("connected");
                    setWorkspaceName(status.workspace_name ?? null);
                    setConnectedAt(status.connected_at ?? null);
                } else {
                    setState("not_connected");
                    setWorkspaceName(null);
                    setConnectedAt(null);
                }
            } catch (err) {
                if (!mountedRef.current) return;
                if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiClientError"]) {
                    if (err.code === "reconnection_required") {
                        setState("reconnection_required");
                    } else {
                        setState("error");
                    }
                    setError(err.message);
                } else {
                    setState("error");
                    setError("Failed to check connection status");
                }
            }
        }
    }["useNotionConnection.useCallback[fetchStatus]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useNotionConnection.useEffect": ()=>{
            mountedRef.current = true;
            fetchStatus();
            return ({
                "useNotionConnection.useEffect": ()=>{
                    mountedRef.current = false;
                }
            })["useNotionConnection.useEffect"];
        }
    }["useNotionConnection.useEffect"], [
        fetchStatus
    ]);
    return {
        state,
        workspaceName,
        connectedAt,
        error,
        refetch: fetchStatus
    };
}
_s(useNotionConnection, "EqcMcNYGr649CitFoErhHvFsY2o=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LoadingSpinner",
    ()=>LoadingSpinner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
"use client";
;
;
function LoadingSpinnerComponent({ size = "md", label }) {
    const sizeMap = {
        sm: "h-4 w-4 border-[2px]",
        md: "h-6 w-6 border-[2px]",
        lg: "h-10 w-10 border-[3px]"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center justify-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `${sizeMap[size]} rounded-full border-white/20 border-t-white animate-spin`,
                role: "status",
                "aria-label": label ?? "Loading"
            }, void 0, false, {
                fileName: "[project]/apps/web/components/ui/LoadingSpinner.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-neutral-400 animate-pulse",
                children: label
            }, void 0, false, {
                fileName: "[project]/apps/web/components/ui/LoadingSpinner.tsx",
                lineNumber: 25,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/ui/LoadingSpinner.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c = LoadingSpinnerComponent;
const LoadingSpinner = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(LoadingSpinnerComponent);
_c1 = LoadingSpinner;
var _c, _c1;
__turbopack_context__.k.register(_c, "LoadingSpinnerComponent");
__turbopack_context__.k.register(_c1, "LoadingSpinner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/notion/ConnectButton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConnectButton",
    ()=>ConnectButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/api-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function ConnectButtonComponent({ className = "", variant = "primary" }) {
    _s();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleConnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ConnectButtonComponent.useCallback[handleConnect]": async ()=>{
            setLoading(true);
            setError(null);
            try {
                const { url } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/auth/notion/connect");
                // Full-page redirect to Notion OAuth
                window.location.href = url;
            } catch (err) {
                setLoading(false);
                if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiClientError"]) {
                    setError(err.message);
                } else {
                    setError("Failed to initiate connection");
                }
            }
        }
    }["ConnectButtonComponent.useCallback[handleConnect]"], []);
    if (variant === "compact") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: handleConnect,
            disabled: loading,
            className: `inline-flex items-center gap-2 bg-white text-black font-medium text-sm px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 ${className}`,
            children: [
                loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                    size: "sm"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                    lineNumber: 49,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    src: "/notion.png",
                    alt: "",
                    width: 16,
                    height: 16
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                    lineNumber: 51,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "Connect"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                    lineNumber: 53,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
            lineNumber: 43,
            columnNumber: 7
        }, this);
    }
    if (variant === "card") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `flex flex-col gap-3 ${className}`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: handleConnect,
                    disabled: loading,
                    className: "w-full rounded-2xl bg-white text-black font-bold text-base py-5 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    children: loading ? "Connecting..." : "Connect Notion"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                    lineNumber: 61,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-neutral-400 text-center",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                    lineNumber: 69,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
            lineNumber: 60,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `flex flex-col items-center gap-4 ${className}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: handleConnect,
                disabled: loading,
                className: "group relative flex items-center gap-3 bg-white text-black font-semibold text-base px-8 py-4 rounded-2xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5",
                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-5 w-5 rounded-full border-2 border-black/20 border-t-black animate-spin"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                            lineNumber: 84,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Connecting…"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                            lineNumber: 85,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            src: "/notion.png",
                            alt: "Notion",
                            width: 20,
                            height: 20,
                            className: "group-hover:scale-110 transition-transform"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                            lineNumber: 89,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Connect Notion"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                            lineNumber: 96,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-neutral-400 text-center max-w-xs",
                children: error
            }, void 0, false, {
                fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
                lineNumber: 102,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/notion/ConnectButton.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
_s(ConnectButtonComponent, "1E2S+iKFv5PHogxL4RS0jy9TcUc=");
_c = ConnectButtonComponent;
const ConnectButton = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(ConnectButtonComponent);
_c1 = ConnectButton;
var _c, _c1;
__turbopack_context__.k.register(_c, "ConnectButtonComponent");
__turbopack_context__.k.register(_c1, "ConnectButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useNotionConnection$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useNotionConnection.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$notion$2f$ConnectButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/notion/ConnectButton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/LoadingSpinner.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function HomePage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { state } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useNotionConnection$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotionConnection"])();
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomePage.useEffect": ()=>{
            setMounted(true);
        }
    }["HomePage.useEffect"], []);
    if (!mounted || state === "loading") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "min-h-screen flex items-center justify-center bg-black text-white",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$LoadingSpinner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingSpinner"], {
                size: "lg"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/page.tsx",
                lineNumber: 22,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/web/app/page.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen bg-black text-white flex flex-col p-6 md:p-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 text-xl font-semibold mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        src: "/logo.png",
                        alt: "Logo",
                        width: 28,
                        height: 28,
                        className: "brightness-200"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/page.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Fairquanta"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/page.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/page.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "w-full max-w-[440px] bg-neutral-900 border border-neutral-800 rounded-[40px] px-12 py-12 flex flex-col items-center shadow-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col items-center w-full",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        src: "/notion.png",
                                        alt: "Notion",
                                        width: 40,
                                        height: 40,
                                        className: "object-contain"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/page.tsx",
                                        lineNumber: 53,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/page.tsx",
                                    lineNumber: 52,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-3xl font-bold text-center leading-tight mb-6",
                                    children: [
                                        "Connect your ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/apps/web/app/page.tsx",
                                            lineNumber: 64,
                                            columnNumber: 28
                                        }, this),
                                        " Notion workspace"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/page.tsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-neutral-400 text-center text-sm leading-relaxed px-2 mb-12",
                                    children: "Link your Notion account to search pages, query databases, and interact with your workspace through MCP."
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/page.tsx",
                                    lineNumber: 68,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/page.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-full max-w-[280px]",
                            children: state === "connected" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.push("/dashboard"),
                                className: "w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98]",
                                children: "Go to Dashboard"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/page.tsx",
                                lineNumber: 77,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$notion$2f$ConnectButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConnectButton"], {
                                variant: "card",
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/page.tsx",
                                lineNumber: 84,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/page.tsx",
                            lineNumber: 75,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-auto pt-10 text-[11px] text-neutral-500 text-center leading-relaxed max-w-[300px]",
                            children: "Your credentials are encrypted and stored server-side. We never access your Notion data without your permission."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/page.tsx",
                            lineNumber: 92,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/page.tsx",
                    lineNumber: 46,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/page.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/page.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_s(HomePage, "MiBnNWP1b4sfuDG9izg2gCpi7so=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useNotionConnection$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNotionConnection"]
    ];
});
_c = HomePage;
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_dbdecbaf._.js.map