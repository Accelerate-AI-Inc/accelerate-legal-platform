"use client";

import { useEffect, useRef, useState } from "react";
import { Check, EyeOff, User } from "lucide-react";
import { openSourceWorkflow } from "@/app/lib/accelerateApi";
import type { WorkflowOpenSourceSubmission } from "@/app/components/shared/types";
import { Modal } from "@/app/components/modals/Modal";
import { ModalSegmentedToggle } from "@/app/components/modals/ModalSegmentedToggle";
import {
    FieldLabel,
    FormTextInput,
} from "@/app/components/ui/form-field";
import { userFacingApiError } from "@/app/lib/userFacingError";
import { SURFACE_PANEL_CLASS } from "@/shared/ui/SurfaceUI";

type OpenSourceContributorMode = "named" | "anonymous";
type OpenSourceStatus = "idle" | "loading" | "complete";

const WORKFLOWS_REPO_URL =
    "https://github.com/accelerate-ai/accelerate-workflows";

interface OpenSourceWorkflowModalProps {
    open: boolean;
    onClose: () => void;
    workflowId: string;
    defaultContributorName: string;
    pending: boolean;
    onSubmitted: (submission: WorkflowOpenSourceSubmission) => void;
}

export function OpenSourceWorkflowModal({
    open,
    onClose,
    workflowId,
    defaultContributorName,
    pending,
    onSubmitted,
}: OpenSourceWorkflowModalProps) {
    const [status, setStatus] = useState<OpenSourceStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [contributorMode, setContributorMode] =
        useState<OpenSourceContributorMode>("anonymous");
    const [contributorName, setContributorName] = useState("");
    const [contributorOrganisation, setContributorOrganisation] = useState("");
    const [contributorRole, setContributorRole] = useState("");
    const [contributorLinkedin, setContributorLinkedin] = useState("");
    const [disclosureConsent, setDisclosureConsent] = useState(false);
    const [closeCountdown, setCloseCountdown] = useState(3);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    function resetModalState() {
        setStatus("idle");
        setError(null);
        setContributorMode("anonymous");
        setContributorName("");
        setContributorOrganisation("");
        setContributorRole("");
        setContributorLinkedin("");
        setDisclosureConsent(false);
        setCloseCountdown(3);
    }

    useEffect(() => {
        if (status !== "complete") return;

        const countdownTimer = window.setInterval(() => {
            setCloseCountdown((current) => Math.max(current - 1, 1));
        }, 1000);
        const closeTimer = window.setTimeout(() => {
            onCloseRef.current();
            resetModalState();
        }, 3000);

        return () => {
            window.clearInterval(countdownTimer);
            window.clearTimeout(closeTimer);
        };
    }, [status]);

    const loading = status === "loading";
    const submitted = status === "complete";
    const needsConsent = contributorMode === "named" && !disclosureConsent;

    async function handleSubmit() {
        setStatus("loading");
        setError(null);
        try {
            const response = await openSourceWorkflow(workflowId, {
                contributor_mode: contributorMode,
                contributor:
                    contributorMode === "named"
                        ? {
                              name:
                                  contributorName.trim() ||
                                  defaultContributorName,
                              organisation:
                                  contributorOrganisation.trim() || null,
                              role: contributorRole.trim() || null,
                              linkedin: contributorLinkedin.trim() || null,
                          }
                        : null,
            });
            onSubmitted({
                id: response.id,
                status: response.status,
                submitted_at: response.submitted_at,
                updated_at: response.updated_at,
                reviewed_at: response.reviewed_at ?? null,
            });
            setCloseCountdown(3);
            setStatus("complete");
        } catch (err) {
            setStatus("idle");
            setError(
                userFacingApiError(
                    err,
                    "Failed to submit workflow for review.",
                ),
            );
        }
    }

    return (
        <Modal
            open={open}
            onClose={() => {
                if (loading) return;
                onClose();
                resetModalState();
            }}
            breadcrumbs={[
                "Workflows",
                submitted
                    ? "Submitted"
                    : pending
                      ? "Update open-source submission"
                      : "Open source",
            ]}
            primaryAction={
                submitted
                    ? undefined
                    : {
                          label: loading
                              ? pending
                                  ? "Updating..."
                                  : "Submitting..."
                              : pending
                                ? "Update submission"
                                : "Submit for review",
                          onClick: () => void handleSubmit(),
                          disabled: loading || needsConsent,
                      }
            }
        >
            {submitted ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-10 text-center">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-positive/70 bg-positive-wash/55 text-positive ring-1 ring-rule/70">
                        <Check className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-serif text-ink">
                        Workflow submitted
                    </h3>
                    <p className="mt-3 max-w-sm text-xs leading-6 text-ink-muted">
                        Your workflow snapshot has been submitted for review.
                        You&apos;ll be notified by email if it is accepted.
                    </p>
                    <p className="mt-6 text-xs font-medium text-ink-muted">
                        Closing in {closeCountdown}
                    </p>
                </div>
            ) : (
                <div className="space-y-4 pb-2 text-sm text-ink">
                    <h3 className="text-2xl font-serif text-ink">
                        Contribute to open source legal
                    </h3>
                    <p className="leading-6 text-xs text-ink-muted">
                        Submit a snapshot of this workflow for review. If
                        accepted, it will be shared under the Apache License 2.0
                        in the{" "}
                        <a
                            href={WORKFLOWS_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-ink underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink-muted"
                        >
                            accelerate-ai/accelerate-workflows
                        </a>{" "}
                        repo. You&apos;ll be notified by email if your workflow
                        is accepted.
                    </p>
                    {pending && (
                        <p className={`rounded-sm px-3 py-2 text-xs leading-5 text-ink-muted ${SURFACE_PANEL_CLASS}`}>
                            You already have a pending submission. This will
                            replace that pending snapshot.
                        </p>
                    )}

                    <div className="space-y-2 pt-2">
                        <FieldLabel as="p">
                            Contributor attribution
                        </FieldLabel>
                        <ModalSegmentedToggle
                            value={contributorMode}
                            onChange={setContributorMode}
                            disabled={loading}
                            options={[
                                {
                                    value: "anonymous",
                                    label: "Anonymous",
                                    icon: EyeOff,
                                },
                                {
                                    value: "named",
                                    label: "Disclose details",
                                    icon: User,
                                },
                            ]}
                        />
                        {contributorMode === "named" && (
                            <div className="grid gap-x-4 gap-y-5 pt-4 sm:grid-cols-2">
                                <div>
                                    <FieldLabel htmlFor="open-source-contributor-name">
                                        Full Name
                                    </FieldLabel>
                                    <FormTextInput
                                        id="open-source-contributor-name"
                                        value={contributorName}
                                        onChange={(event) =>
                                            setContributorName(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Jane Doe"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="open-source-contributor-organisation">
                                        Organisation
                                    </FieldLabel>
                                    <FormTextInput
                                        id="open-source-contributor-organisation"
                                        value={contributorOrganisation}
                                        onChange={(event) =>
                                            setContributorOrganisation(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Acme LLP"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="open-source-contributor-role">
                                        Role
                                    </FieldLabel>
                                    <FormTextInput
                                        id="open-source-contributor-role"
                                        value={contributorRole}
                                        onChange={(event) =>
                                            setContributorRole(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Senior Associate"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <FieldLabel htmlFor="open-source-contributor-linkedin">
                                        LinkedIn
                                    </FieldLabel>
                                    <FormTextInput
                                        id="open-source-contributor-linkedin"
                                        type="url"
                                        value={contributorLinkedin}
                                        onChange={(event) =>
                                            setContributorLinkedin(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://linkedin.com/in/janedoe"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex items-start gap-2 pt-1 sm:col-span-2">
                                    <input
                                        id="open-source-disclosure-consent"
                                        type="checkbox"
                                        checked={disclosureConsent}
                                        onChange={(event) =>
                                            setDisclosureConsent(
                                                event.target.checked,
                                            )
                                        }
                                        disabled={loading}
                                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-rule-strong text-ink accent-ink focus:ring-rule-strong disabled:cursor-not-allowed"
                                    />
                                    <p className="text-xs leading-5 text-ink-muted">
                                        <label
                                            htmlFor="open-source-disclosure-consent"
                                            className="cursor-pointer"
                                        >
                                            I consent to disclosing the personal
                                            information above in the public
                                        </label>{" "}
                                        <a
                                            href={WORKFLOWS_REPO_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-ink underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink-muted"
                                        >
                                            accelerate-ai/accelerate-workflows
                                        </a>{" "}
                                        <label
                                            htmlFor="open-source-disclosure-consent"
                                            className="cursor-pointer"
                                        >
                                            GitHub repository and on the
                                            accelerateai.io website.
                                        </label>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-sm bg-critical-wash px-3 py-2 text-xs font-medium text-critical">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
