import React from "react";
import {
  Briefcase,
  BriefcaseBusiness,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Presentation,
} from "lucide-react";

type DirectoryIconProps = {
  className?: string;
  draggable?: boolean;
};

/**
 * Directory and file-type icons for the task pane.
 *
 * Line icons in `currentColor`, matching the web app's FileTypeIcon and
 * FolderSvgIcon. These previously imported eight full-color gradient SVG assets
 * through the `@icons` webpack alias; the assets are gone and the icons now
 * follow the surrounding ink, so they are correct in both themes.
 */
function iconKind(
  value: string | null | undefined,
): "pdf" | "word" | "excel" | "ppt" | "other" {
  const raw = (value ?? "").toLowerCase().trim();
  const extension = raw.includes(".") ? (raw.split(".").pop() ?? "") : raw;
  if (extension === "pdf") return "pdf";
  if (extension === "doc" || extension === "docx") return "word";
  if (["xls", "xlsx", "xlsm"].includes(extension)) return "excel";
  if (extension === "ppt" || extension === "pptx") return "ppt";
  return "other";
}

const FILE_ICONS = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  ppt: Presentation,
  other: File,
};

export function FileTypeIcon({
  fileType,
  className = "h-3.5 w-3.5",
}: {
  fileType: string | null | undefined;
  className?: string;
}): React.ReactElement {
  const Icon = FILE_ICONS[iconKind(fileType)];
  return (
    <Icon
      aria-hidden="true"
      className={`${className} shrink-0 text-ink-faint`}
    />
  );
}

export function SubfolderSvgIcon({
  open = false,
  className,
  ...props
}: DirectoryIconProps & { open?: boolean }): React.ReactElement {
  const Icon = open ? FolderOpen : Folder;
  return (
    <Icon
      aria-hidden="true"
      className={`${className ?? ""} shrink-0`.trim()}
      {...props}
    />
  );
}

export function ProjectSvgIcon({
  open = false,
  className,
  ...props
}: DirectoryIconProps & { open?: boolean }): React.ReactElement {
  const Icon = open ? BriefcaseBusiness : Briefcase;
  return (
    <Icon
      aria-hidden="true"
      className={`${className ?? ""} shrink-0`.trim()}
      {...props}
    />
  );
}
