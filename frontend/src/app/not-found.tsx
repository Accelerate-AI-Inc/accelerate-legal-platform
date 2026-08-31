import Link from "next/link";
import { PillButton } from "@/app/components/ui/pill-button";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-serif font-light text-ink mb-3">
                    Page not found
                </h1>
                <p className="text-[0.9375rem] text-ink-muted leading-relaxed mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or may
                    have been moved.
                </p>

                <PillButton asChild tone="ink" size="normal">
                    <Link href="/">Go home</Link>
                </PillButton>
            </div>
        </div>
    );
}
