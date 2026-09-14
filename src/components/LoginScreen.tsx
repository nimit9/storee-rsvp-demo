import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, login } from "../api";

/**
 * The passphrase gate. Deliberately plain: the people typing here are the couple
 * and their family, not operators, so it says what this is and what to do —
 * nothing about sessions, cookies or tokens.
 */
export function LoginScreen({ couple, onSuccess }: { couple: string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn’t sign in.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border bg-card">
            <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{couple}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The guest list is private. Enter the passphrase to open it.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-lg border bg-card p-5">
          <div className="grid gap-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input
              id="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              className="h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "passphrase-error" : undefined}
            />
            {error && (
              <p id="passphrase-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button type="submit" className="mt-4 h-11 w-full" disabled={busy || !password.trim()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {busy ? "Checking…" : "Open the guest list"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ask whoever shared this link if you don’t have the passphrase.
        </p>
      </div>
    </div>
  );
}
