import { CARD_SURFACE_CLASS } from "@/app/components/ui/card";

export const RESPONSE_SURFACE_CLASS = CARD_SURFACE_CLASS;

export function withoutMarkdownNode<P extends { node?: unknown }>(
    props: P,
): Omit<P, "node"> {
    const { node, ...rest } = props;
    void node;
    return rest;
}
