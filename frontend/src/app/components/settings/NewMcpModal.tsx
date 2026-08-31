"use client";

import { Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { FieldLabel } from "@/app/components/ui/form-field";
import {
    SETTINGS_CONTROL_CLASS,
    SettingsTextInput,
} from "@/app/components/settings/SettingsTextInput";
import { Modal } from "@/app/components/modals/Modal";
import type { McpConnectorSummary } from "@/app/lib/accelerateApi";
import {
    settingsGlassIconButtonClassName,
} from "@/app/(pages)/settings/settingsStyles";

export type NewMcpDraft = {
    name: string;
    serverUrl: string;
    bearerToken: string;
    customHeaders: string;
};

export type NewMcpStep = "form" | "working" | "auth" | "success";

interface NewMcpModalProps {
    open: boolean;
    draft: NewMcpDraft;
    step: NewMcpStep;
    result: McpConnectorSummary | null;
    error: string | null;
    authMessage: string | null;
    showToken: boolean;
    showAdvanced: boolean;
    onDraftChange: (draft: NewMcpDraft) => void;
    onShowTokenChange: (show: boolean) => void;
    onShowAdvancedChange: (show: boolean) => void;
    onClose: () => void;
    onSubmit: () => Promise<void>;
    onOpenConnector: (connectorId: string) => void;
}

export function NewMcpModal({
    open,
    draft,
    step,
    result,
    error,
    authMessage,
    showToken,
    showAdvanced,
    onDraftChange,
    onShowTokenChange,
    onShowAdvancedChange,
    onClose,
    onSubmit,
    onOpenConnector,
}: NewMcpModalProps) {
    const canSubmit =
        draft.name.trim().length > 0 &&
        draft.serverUrl.trim().length > 0 &&
        step !== "working" &&
        step !== "auth";

    return (
        <Modal
            open={open}
            onClose={onClose}
            breadcrumbs={[
                "Connectors",
                step === "success"
                    ? "Connector added"
                    : step === "auth"
                      ? "Authenticate connector"
                      : "New MCP connector",
            ]}
            size="lg"
            primaryAction={
                step === "success" && result
                    ? {
                          label: "View connector",
                          onClick: () => onOpenConnector(result.id),
                      }
                    : {
                          label:
                              step === "working"
                                  ? "Connecting..."
                                  : step === "auth"
                                    ? "Authorizing..."
                                    : "Connect",
                          icon:
                              step === "working" || step === "auth" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                              ) : undefined,
                          onClick: () => void onSubmit(),
                          disabled: !canSubmit,
                      }
            }
            cancelAction={
                step === "working" || step === "auth"
                    ? false
                    : {
                          label: step === "success" ? "Done" : "Cancel",
                          onClick: onClose,
                      }
            }
            footerStatus={
                error ? (
                    <div className="rounded-sm border border-rule/70 bg-surface/75 px-3 py-2 text-sm text-critical">
                        {error}
                    </div>
                ) : null
            }
        >
            {step === "success" && result ? (
                <NewMcpSuccess connector={result} />
            ) : step === "auth" ? (
                <NewMcpAuth
                    message={
                        authMessage ??
                        "Complete authorization in the popup to finish connecting this MCP server."
                    }
                />
            ) : (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
                    <p className="text-sm text-ink-muted">
                        The assistant will have access to this MCP server and
                        its enabled tools.
                    </p>
                    <NewMcpForm
                        draft={draft}
                        showToken={showToken}
                        showAdvanced={showAdvanced}
                        disabled={step === "working"}
                        onDraftChange={onDraftChange}
                        onShowTokenChange={onShowTokenChange}
                        onShowAdvancedChange={onShowAdvancedChange}
                    />
                </div>
            )}
        </Modal>
    );
}

function NewMcpForm({
    draft,
    showToken,
    showAdvanced,
    disabled,
    onDraftChange,
    onShowTokenChange,
    onShowAdvancedChange,
}: {
    draft: NewMcpDraft;
    showToken: boolean;
    showAdvanced: boolean;
    disabled: boolean;
    onDraftChange: (draft: NewMcpDraft) => void;
    onShowTokenChange: (show: boolean) => void;
    onShowAdvancedChange: (show: boolean) => void;
}) {
    return (
        <div className="grid gap-3 pt-1">
            <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                <FieldLabel htmlFor="new-mcp-label">Label</FieldLabel>
                <SettingsTextInput
                    id="new-mcp-label"
                    value={draft.name}
                    onChange={(event) =>
                        onDraftChange({ ...draft, name: event.target.value })
                    }
                    placeholder="Connector label"
                    className="h-8"
                    disabled={disabled}
                />
            </div>
            <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                <FieldLabel htmlFor="new-mcp-url">URL endpoint</FieldLabel>
                <SettingsTextInput
                    id="new-mcp-url"
                    value={draft.serverUrl}
                    onChange={(event) =>
                        onDraftChange({
                            ...draft,
                            serverUrl: event.target.value,
                        })
                    }
                    placeholder="https://mcp.example.com/mcp"
                    className="h-8"
                    disabled={disabled}
                />
            </div>
            <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
                <FieldLabel htmlFor="new-mcp-token">Bearer token</FieldLabel>
                <div className="min-w-0">
                    <div className="relative">
                        <SettingsTextInput
                            id="new-mcp-token"
                            value={draft.bearerToken}
                            onChange={(event) =>
                                onDraftChange({
                                    ...draft,
                                    bearerToken: event.target.value,
                                })
                            }
                            type={showToken ? "text" : "password"}
                            placeholder="Bearer token"
                            className="h-8 pr-10"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={disabled}
                        />
                        {draft.bearerToken && (
                            <button
                                type="button"
                                className={`absolute inset-y-1 right-1.5 flex items-center ${settingsGlassIconButtonClassName}`}
                                onClick={() => onShowTokenChange(!showToken)}
                                aria-label={
                                    showToken ? "Hide token" : "Show token"
                                }
                                disabled={disabled}
                            >
                                {showToken ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        )}
                    </div>
                    <p className="mt-1 text-right text-xs text-ink-muted">
                        Tokens are stored encrypted.
                    </p>
                </div>
            </div>
            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={() => onShowAdvancedChange(!showAdvanced)}
                    className="inline-flex items-center gap-1 justify-self-start text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    disabled={disabled}
                >
                    Advanced
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                            showAdvanced ? "" : "-rotate-90"
                        }`}
                    />
                </button>
                {showAdvanced && (
                    <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
                        <FieldLabel htmlFor="new-mcp-headers">
                            Custom headers
                        </FieldLabel>
                        <div className="min-w-0">
                            <textarea
                                id="new-mcp-headers"
                                value={draft.customHeaders}
                                onChange={(event) =>
                                    onDraftChange({
                                        ...draft,
                                        customHeaders: event.target.value,
                                    })
                                }
                                placeholder='{"X-API-Key":"secret"}'
                                className={`min-h-20 resize-y py-2 ${SETTINGS_CONTROL_CLASS}`}
                                autoComplete="off"
                                spellCheck={false}
                                disabled={disabled}
                            />
                            <p className="mt-1 text-right text-xs text-ink-muted">
                                Secrets are stored encrypted.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NewMcpSuccess({ connector }: { connector: McpConnectorSummary }) {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4 pb-4">
            <div className="flex items-start gap-3 rounded-sm border border-positive/80 bg-positive-wash/80 px-3 py-3 text-positive">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                <p className="min-w-0 truncate text-sm font-medium">
                    {connector.name} is connected.{" "}
                    <span className="font-normal text-positive">
                        {connector.tools.length} tools discovered.
                    </span>
                </p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-rule bg-surface/60">
                <div className="max-h-full overflow-y-auto divide-y divide-rule">
                    {connector.tools.map((tool) => (
                        <div
                            key={tool.openaiToolName}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink">
                                    {tool.title ?? tool.openaiToolName}
                                </p>
                                {tool.description && (
                                    <p className="truncate text-xs text-ink-muted">
                                        {tool.description}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-ink-faint">
                                {tool.enabled ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function NewMcpAuth({ message }: { message: string }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 pb-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-rule/70 bg-surface/75 text-ink">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-medium text-ink">
                    Authentication required
                </h3>
                <p className="text-sm text-ink-muted">{message}</p>
            </div>
        </div>
    );
}
