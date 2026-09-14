import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENTS, INVITE_LINKS, TIERS, TIER_LABELS } from "../types";

/**
 * The four guest links, with what each one asks about. Without this the host has
 * to keep the slug-to-tier mapping somewhere else and match it by hand — which
 * is exactly the confusion the client worried about when he asked whether four
 * links would get mixed up.
 */
export function InviteLinks() {
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
            <Button asChild variant="outline" size="sm" className="h-11 shrink-0 sm:h-9">
              <a href={`/${slug}`} target="_blank" rel="noreferrer" aria-label={`Open the ${label.toLowerCase()} invite`}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span>Open invite</span>
              </a>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
