"use client";

import { Library } from "lucide-react";
import { FileTypeIcon } from "../shared/FileTypeIcon";
import type { MessageFile } from "../shared/types";
import { SURFACE_PANEL_CLASS } from "@/shared/ui/SurfaceUI";

interface Props {
    content: string;
    files?: MessageFile[];
    workflow?: { id: string; title: string };
    onFileClick?: (file: MessageFile) => void;
}

export function UserMessage({ content, files, workflow, onFileClick }: Props) {
    const hasFiles = files && files.length > 0;

    return (
        <div className="w-full flex justify-end">
            <div className="max-w-[80%] bg-surface-sunk rounded-sm px-4 py-3">
                <p className="text-sm text-ink whitespace-pre-wrap">{content}</p>
                {(workflow || hasFiles) && (
                    <div className="flex flex-wrap justify-end gap-1.5 mt-3">
                        {workflow && (
                            <div className="inline-flex items-center gap-1 pl-2 pr-2.5 py-0.5 rounded-full text-xs bg-accent text-paper shadow border border-accent">
                                <Library className="h-2.5 w-2.5 shrink-0" />
                                <span className="max-w-[140px] truncate">{workflow.title}</span>
                            </div>
                        )}
                        {hasFiles &&
                            files.map((f, i) => {
                                const className =
                                    `inline-flex items-center gap-1 rounded-[10px] py-0.5 pl-2 pr-2.5 text-xs text-ink ${SURFACE_PANEL_CLASS}`;
                                const fileContent = (
                                    <>
                                        <FileTypeIcon
                                            fileType={f.filename}
                                            className="h-2.5 w-2.5"
                                        />
                                        <span className="max-w-[140px] truncate">
                                            {f.filename}
                                        </span>
                                    </>
                                );
                                return f.document_id && onFileClick ? (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => onFileClick(f)}
                                        aria-label={`Open ${f.filename}`}
                                        className={`${className} cursor-pointer transition-colors hover:bg-surface/80`}
                                    >
                                        {fileContent}
                                    </button>
                                ) : (
                                    <div key={i} className={className}>
                                        {fileContent}
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
}
