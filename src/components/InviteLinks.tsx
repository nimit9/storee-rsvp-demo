import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EVENTS, INVITE_LINKS, TIERS, TIER_LABELS } from "../types";

/**
 * The four guest links, with what each one asks about. Without this the host has
 * to keep the slug-to-tier mapping somewhere else and match it by hand — which
 * is exactly the confusion the client worried about when he asked whether four
 * links would get mixed up.
 */
export function InviteLinks({ origin = window.location.origin }: { origin?: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(slug: string, label: string) {
    const url = `${origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      toast.success(`Copied the ${label.toLowerCase()} link`);
      window.setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      toast.error("Couldn’t copy — select the link and copy it by hand.");
    }
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {INVITE_LINKS.map(({ slug, tier }) => {
        const label = TIER_LABELS[tier] ?? tier;
        const events = (TIERS[tier] ?? []).map(
          (k) => EVENTS.find((e) => e.key === k)?.label ?? k,
        );
        return (
          <li key={slug} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{events.join(" · ")}</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">/{slug}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-11 shrink-0 sm:h-9"
              onClick={() => copy(slug, label)}
              aria-label={`Copy the ${label.toLowerCase()} invite link`}
            >
              {copied === slug ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              <span className="sr-only sm:not-sr-only">
                {copied === slug ? "Copied" : "Copy"}
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
