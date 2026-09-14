import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../hooks/useTheme";

/**
 * One click, light to dark and back. It was briefly a three-option menu, which
 * put a step between the click and the change for no benefit — the people using
 * this are the couple and their family, not operators tuning a preference.
 *
 * "Follow my device" is still the starting point: nothing is stored until the
 * first click, and until then useTheme tracks the OS setting live. The icon
 * shows what the click will do, not what the current mode is.
 */
export function ThemeToggle() {
  const { dark, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-11 sm:size-9"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}
