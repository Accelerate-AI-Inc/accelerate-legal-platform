import { Briefcase, BriefcaseBusiness, Folder, FolderOpen } from "lucide-react";

type FolderIconProps = {
    className?: string;
    draggable?: boolean;
};

type FolderStateIconProps = FolderIconProps & {
    open?: boolean;
};

/**
 * Directory icons.
 *
 * Line icons in `currentColor`, replacing the four gradient SVG assets these
 * wrapped. A matter reads as a briefcase and a folder as a folder, so the two
 * levels of the tree stay distinguishable without color.
 *
 * The `SvgIcon` names are kept because they are imported across the app; only
 * the drawing changed.
 */
function iconClassName(className?: string) {
    return `${className ?? ""} shrink-0`.trim();
}

export function ClosedSubfolderSvgIcon({ className, ...props }: FolderIconProps) {
    return (
        <Folder
            aria-hidden="true"
            className={iconClassName(className)}
            {...props}
        />
    );
}

export function OpenSubfolderSvgIcon({ className, ...props }: FolderIconProps) {
    return (
        <FolderOpen
            aria-hidden="true"
            className={iconClassName(className)}
            {...props}
        />
    );
}

export function SubfolderSvgIcon({
    open = false,
    ...props
}: FolderStateIconProps) {
    return open ? (
        <OpenSubfolderSvgIcon {...props} />
    ) : (
        <ClosedSubfolderSvgIcon {...props} />
    );
}

export function ClosedProjectSvgIcon({ className, ...props }: FolderIconProps) {
    return (
        <Briefcase
            aria-hidden="true"
            className={iconClassName(className)}
            {...props}
        />
    );
}

export function OpenProjectSvgIcon({ className, ...props }: FolderIconProps) {
    return (
        <BriefcaseBusiness
            aria-hidden="true"
            className={iconClassName(className)}
            {...props}
        />
    );
}

export function ProjectSvgIcon({ open = false, ...props }: FolderStateIconProps) {
    return open ? (
        <OpenProjectSvgIcon {...props} />
    ) : (
        <ClosedProjectSvgIcon {...props} />
    );
}

export function ClosedFolderSvgIcon(props: FolderIconProps) {
    return <ClosedSubfolderSvgIcon {...props} />;
}

export function OpenFolderSvgIcon(props: FolderIconProps) {
    return <OpenSubfolderSvgIcon {...props} />;
}
