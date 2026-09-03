"use client";

import { Suspense } from "react";
import { DesktopAuthHandoff } from "@/app/components/auth/DesktopAuthHandoff";

export default function DesktopAuthPage() {
    return (
        <Suspense fallback={null}>
            <DesktopAuthHandoff />
        </Suspense>
    );
}
