"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { FieldLabel } from "@/app/components/ui/form-field";
import { authenticatedFetch } from "@/app/lib/authEvents";

type FeedbackType = "bug" | "feature" | "question" | "other";

export default function SupportPage() {
    const router = useRouter();
    const { user, isAuthenticated, authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [authLoading, isAuthenticated, router]);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>("question");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [link, setLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const feedbackTypes: {
        value: FeedbackType;
        label: string;
        description: string;
    }[] = [
        {
            value: "bug",
            label: "Bug Report",
            description: "Report something that isn't working",
        },
        {
            value: "feature",
            label: "Feature Request",
            description: "Suggest a new feature or improvement",
        },
        {
            value: "question",
            label: "Question",
            description: "Ask a question about using Accelerate Legal",
        },
        {
            value: "other",
            label: "Other",
            description: "General feedback or other inquiries",
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await authenticatedFetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: feedbackType,
                    subject,
                    message,
                    email: user?.email,
                    link,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit feedback");
            }

            setIsSubmitted(true);
        } catch (err) {
            console.error("Error submitting feedback:", err);
            setError("Failed to submit your feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-surface rounded-sm text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-positive-wash rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-positive" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-semibold text-ink mb-2">
                        Thank you for helping us improve.
                    </h2>
                    <p className="text-ink-muted mb-6">
                        We will get in touch with you soon via email.
                    </p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 bg-accent text-paper rounded-sm hover:bg-accent-hover transition-colors font-medium text-sm"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col px-6 h-full">
            <div className="w-full max-w-4xl m-auto flex flex-col h-full">
                {/* Fixed Header Section */}
                <div className="flex-shrink-0 pt-6 md:pt-10 pb-0">
                    <div className="mb-5">
                        <h1 className="text-4xl font-medium font-serif text-ink mb-3">
                            Support
                        </h1>
                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 overflow-y-auto pb-6">
                    <div className="bg-surface rounded-sm border border-rule p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Feedback Type Selection */}
                            <div>
                                <FieldLabel as="p">
                                    What can we help you with?
                                </FieldLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    {feedbackTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() =>
                                                setFeedbackType(type.value)
                                            }
                                            className={`p-4 rounded-sm border-2 text-left transition-all ${
                                                feedbackType === type.value
                                                    ? "border-accent bg-accent-wash"
                                                    : "border-rule hover:border-rule-strong"
                                            }`}
                                        >
                                            <div
                                                className={`font-medium ${
                                                    feedbackType === type.value
                                                        ? "text-accent"
                                                        : "text-ink"
                                                }`}
                                            >
                                                {type.label}
                                            </div>
                                            <div className="text-xs text-ink-muted mt-1">
                                                {type.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Link (for bugs) */}
                            {feedbackType === "bug" && (
                                <div>
                                    <FieldLabel htmlFor="link">
                                        Link to issue (optional)
                                    </FieldLabel>
                                    <input
                                        type="url"
                                        id="link"
                                        value={link}
                                        onChange={(e) =>
                                            setLink(e.target.value)
                                        }
                                        placeholder="https://accelerateai.io/..."
                                        className="w-full px-4 py-2.5 border border-rule-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                    />
                                    <p className="text-xs text-ink-muted mt-1">
                                        If the bug is in a chat, mouseover the
                                        chat in the sidebar, click the dots,
                                        then click share and paste the link
                                        here.
                                    </p>
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <FieldLabel htmlFor="subject">
                                    Subject
                                </FieldLabel>
                                <input
                                    type="text"
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-rule-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                    required
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <FieldLabel htmlFor="message">
                                    Message
                                </FieldLabel>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Please describe your question, issue, or suggestion in detail..."
                                    rows={5}
                                    className="w-full px-4 py-2.5 border border-rule-strong rounded-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Email Display (if logged in) */}
                            {user?.email && (
                                <div className="text-sm text-ink-muted">
                                    We&apos;ll respond to:{" "}
                                    <span className="font-medium">
                                        {user.email}
                                    </span>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-critical-wash border border-critical rounded-sm text-sm text-critical">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !subject.trim() ||
                                    !message.trim()
                                }
                                className="w-full py-3 px-4 bg-accent text-paper rounded-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-rule border-t-transparent rounded-full animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span>Submit</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
