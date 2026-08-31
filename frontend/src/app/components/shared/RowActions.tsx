"use client";

import {
    forwardRef,
    useEffect,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
} from "react";
import { createPortal } from "react-dom";
import {
    Download,
    Eye,
    EyeOff,
    FolderMinus,
    Hash,
    History,
    Pencil,
    Trash2,
    Upload,
} from "lucide-react";
import { SubfolderSvgIcon } from "@/app/components/shared/FolderSvgIcon";
import {
    CLOSE_ROW_ACTIONS_EVENT,
    closeRowActionMenus,
} from "@/app/components/shared/TablePrimitive";
import {
    MenuButton,
    MenuSurface,
} from "@/app/components/ui/menu-surface";
import { cn } from "@/app/lib/utils";
import { SURFACE_HOVER_CLASS } from "@/app/components/ui/surface";

export { CLOSE_ROW_ACTIONS_EVENT, closeRowActionMenus };

export type RowActionMenuSurfaceProps = ComponentPropsWithoutRef<"div">;

interface Props {
    onDelete?: () => void;
    onHide?: () => void;
    onUnhide?: () => void;
    onDownload?: () => void;
    onRemoveFromFolder?: () => void;
    onShowAllVersions?: () => void;
    onUploadNewVersion?: () => void;
    onNewSubfolder?: () => void;
    deleting?: boolean;
    deleteDisabled?: boolean;
    onEditDetails?: () => void;
    onRename?: () => void;
    onUpdateCmNumber?: () => void;
    newSubfolderLabel?: string;
    renameLabel?: string;
    uploadNewVersionLabel?: string;
    deleteLabel?: string;
}
type RowActionMenuItemsProps = Props & {
    onClose: () => void;
    surfaceProps?: RowActionMenuSurfaceProps;
};

const ROW_ACTION_ITEM_CLASS =
    "flex items-center gap-2 w-full px-3 py-2 text-ink-muted";
const ROW_ACTION_LEFT_ITEM_CLASS = `text-left ${ROW_ACTION_ITEM_CLASS}`;

export const RowActionMenuItems = forwardRef<
    HTMLDivElement,
    RowActionMenuItemsProps
>(function RowActionMenuItems({
    onDelete,
    onHide,
    onUnhide,
    onDownload,
    onRemoveFromFolder,
    onShowAllVersions,
    onUploadNewVersion,
    onNewSubfolder,
    deleting,
    deleteDisabled = false,
    onEditDetails,
    onRename,
    onUpdateCmNumber,
    newSubfolderLabel = "New subfolder",
    renameLabel = "Rename",
    uploadNewVersionLabel = "Upload new version",
    deleteLabel = "Delete",
    onClose,
    surfaceProps,
}, ref) {
    const { className: surfaceClassName, ...restSurfaceProps } =
        surfaceProps ?? {};

    return (
        <MenuSurface
            ref={ref}
            className={cn("w-48 overflow-hidden", surfaceClassName)}
            {...restSurfaceProps}
        >
            {onNewSubfolder && (
                <MenuButton
                    onClick={() => { onClose(); onNewSubfolder(); }}
                    className={ROW_ACTION_LEFT_ITEM_CLASS}
                >
                    <SubfolderSvgIcon className="h-3.5 w-3.5 shrink-0" />
                    {newSubfolderLabel}
                </MenuButton>
            )}
            {onRename && (
                <MenuButton
                    onClick={() => { onClose(); onRename(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {renameLabel}
                </MenuButton>
            )}
            {onEditDetails && (
                <MenuButton
                    onClick={() => { onClose(); onEditDetails(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit details
                </MenuButton>
            )}
            {onUpdateCmNumber && (
                <MenuButton
                    onClick={() => { onClose(); onUpdateCmNumber(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <Hash className="h-3.5 w-3.5" />
                    Edit CM No.
                </MenuButton>
            )}
            {onDownload && (
                <MenuButton
                    onClick={() => { onClose(); onDownload(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <Download className="h-3.5 w-3.5" />
                    Download
                </MenuButton>
            )}
            {onShowAllVersions && (
                <MenuButton
                    onClick={() => { onClose(); onShowAllVersions(); }}
                    className={ROW_ACTION_LEFT_ITEM_CLASS}
                >
                    <History className="h-3.5 w-3.5 shrink-0" />
                    Show all versions
                </MenuButton>
            )}
            {onUploadNewVersion && (
                <MenuButton
                    onClick={() => { onClose(); onUploadNewVersion(); }}
                    className={ROW_ACTION_LEFT_ITEM_CLASS}
                >
                    <Upload className="h-3.5 w-3.5 shrink-0" />
                    {uploadNewVersionLabel}
                </MenuButton>
            )}
            {onRemoveFromFolder && (
                <MenuButton
                    onClick={() => { onClose(); onRemoveFromFolder(); }}
                    className={ROW_ACTION_LEFT_ITEM_CLASS}
                >
                    <FolderMinus className="h-3.5 w-3.5 shrink-0" />
                    Remove from subfolder
                </MenuButton>
            )}
            {onUnhide && (
                <MenuButton
                    onClick={() => { onClose(); onUnhide(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <Eye className="h-3.5 w-3.5" />
                    Activate
                </MenuButton>
            )}
            {onHide && (
                <MenuButton
                    onClick={() => { onClose(); onHide(); }}
                    className={ROW_ACTION_ITEM_CLASS}
                >
                    <EyeOff className="h-3.5 w-3.5" />
                    Deactivate
                </MenuButton>
            )}
            {onDelete && (
                <button
                    onClick={() => {
                        if (deleteDisabled || deleting) return;
                        onClose();
                        onDelete();
                    }}
                    disabled={deleting || deleteDisabled}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-critical transition-colors disabled:opacity-40 ${
                        deleteDisabled
                            ? "cursor-not-allowed opacity-40 hover:bg-transparent"
                            : "hover:bg-critical/10"
                    }`}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteLabel}
                </button>
            )}
        </MenuSurface>
    );
});

export function RowActions(props: Props) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick() {
            setOpen(false);
        }
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [open]);

    useEffect(() => {
        function handleCloseRowActions() {
            setOpen(false);
        }
        document.addEventListener(CLOSE_ROW_ACTIONS_EVENT, handleCloseRowActions);
        return () =>
            document.removeEventListener(
                CLOSE_ROW_ACTIONS_EVENT,
                handleCloseRowActions,
            );
    }, []);

    function handleToggle(e: React.MouseEvent) {
        e.stopPropagation();
        if (open) {
            setOpen(false);
            return;
        }
        closeRowActionMenus();
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen(true);
    }

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleToggle}
                className={`flex items-center justify-center w-6 h-6 rounded text-ink hover:text-ink transition-colors leading-none ${SURFACE_HOVER_CLASS}`}
            >
                <span className="tracking-widest text-xs">···</span>
            </button>

            {open &&
                createPortal(
                    <RowActionMenuItems
                        {...props}
                        onClose={() => setOpen(false)}
                        surfaceProps={{
                            style: {
                                position: "fixed",
                                top: coords.top,
                                right: coords.right,
                            },
                            className: "z-[120]",
                            onClick: (e) => e.stopPropagation(),
                        }}
                    />,
                    document.body,
                )}
        </>
    );
}
