import type { ReactNode } from "react";
import { SurfaceCard } from "@/app/components/ui/card";

export function SettingsSection({ children }: { children: ReactNode }) {
    return <SurfaceCard>{children}</SurfaceCard>;
}
