"use client";

import { useEffect } from "react";
import { PillButton } from "@/app/components/ui/pill-button";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <html lang="en">
            <head>
                <title>Something went wrong – Accelerate Legal</title>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Newsreader:wght@300;400&display=swap');

                    * { margin: 0; padding: 0; box-sizing: border-box; }

                    /* global-error renders outside the app's token layer, so
                       the editorial palette is inlined here. Keep these values
                       in step with :root in globals.css. */
                    body {
                        font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif;
                        background-color: #faf8f5;
                        color: #17181c;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .error-container {
                        text-align: center;
                        max-width: 480px;
                        padding: 2rem;
                        border-top: 1px solid #cdc6ba;
                    }

                    .error-title {
                        font-family: 'Newsreader', Georgia, serif;
                        font-size: 1.75rem;
                        font-weight: 400;
                        letter-spacing: -0.011em;
                        color: #17181c;
                        margin: 2rem 0 0.75rem;
                    }

                    .error-message {
                        font-size: 0.9375rem;
                        color: #5c5f68;
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }

                    .btn-back { font-family: 'Inter Tight', sans-serif; }
                `}</style>
            </head>
            <body>
                <div className="error-container">
                    <h1 className="error-title">Something went wrong</h1>
                    <p className="error-message">
                        We encountered an unexpected error. This has been logged
                        and our team will look into it.
                    </p>
                    <PillButton
                        tone="accent"
                        size="normal"
                        className="btn-back"
                        onClick={() => window.history.back()}
                    >
                        Back
                    </PillButton>
                </div>
            </body>
        </html>
    );
}
