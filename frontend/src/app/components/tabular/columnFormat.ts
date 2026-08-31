import type { LucideIcon } from "lucide-react";
import { AlignLeft, List, Hash, DollarSign, ToggleLeft, Calendar, Tag, Percent, Banknote } from "lucide-react";
import type { ColumnFormat } from "../shared/types";

export const FORMAT_OPTIONS: Array<{ value: ColumnFormat; label: string; icon: LucideIcon; iconClassName: string }> = [
    { value: "text",            label: "Free Text",       icon: AlignLeft,  iconClassName: "text-cat-2"     },
    { value: "bulleted_list",   label: "Bulleted list",   icon: List,       iconClassName: "text-cat-5"  },
    { value: "number",          label: "Number",          icon: Hash,       iconClassName: "text-cat-5"  },
    { value: "percentage",      label: "Percentage",      icon: Percent,    iconClassName: "text-cat-7" },
    { value: "monetary_amount", label: "Monetary Amount", icon: Banknote,   iconClassName: "text-positive" },
    { value: "currency",        label: "Currency",        icon: DollarSign, iconClassName: "text-cat-6"    },
    { value: "yes_no",          label: "Yes / No",        icon: ToggleLeft, iconClassName: "text-caution"   },
    { value: "date",            label: "Date",            icon: Calendar,   iconClassName: "text-critical"    },
    { value: "tag",             label: "Tags",            icon: Tag,        iconClassName: "text-caution"  },
];

export function formatLabel(format: ColumnFormat): string {
    return FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? "Text";
}

export function formatIcon(format: ColumnFormat): LucideIcon {
    return FORMAT_OPTIONS.find((o) => o.value === format)?.icon ?? AlignLeft;
}

export function formatIconClassName(format: ColumnFormat): string {
    return FORMAT_OPTIONS.find((o) => o.value === format)?.iconClassName ?? "text-cat-2";
}
