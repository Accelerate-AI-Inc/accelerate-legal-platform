/**
 * Nav icons for the app rail.
 *
 * Lucide line icons at Lucide's own stroke weight, sized by the caller. This
 * replaces the faux-3D raster-style SVG set the rail used to load through
 * `next/image` with a cache-busting query string — the editorial system draws
 * chrome in one weight of line, and an icon that carries its own lighting
 * fights every surface it sits on.
 */
export {
    MessageSquare as AssistantIcon,
    Briefcase as MattersIcon,
    BookMarked as LibraryIcon,
    Table2 as ReviewsIcon,
    Workflow as WorkflowsIcon,
    Landmark as ResourcesIcon,
    History as HistoryIcon,
    Settings as SettingsIcon,
    LogOut as SignOutIcon,
} from "lucide-react";
