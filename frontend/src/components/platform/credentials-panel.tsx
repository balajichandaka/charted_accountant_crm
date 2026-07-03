"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable */
          }
        }}
        aria-label={`Copy ${label}`}
        className="shrink-0 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

/** Shows firm login credentials with copy buttons — for one-time handoff. */
export function CredentialsPanel({
  url,
  email,
  password,
}: {
  url?: string;
  email: string;
  password: string;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
      {url ? <CopyRow label="Login URL" value={url} /> : null}
      <CopyRow label="Email" value={email} />
      <CopyRow label="Temporary password" value={password} />
      <p className="text-xs text-muted-foreground">
        Save these now — the password is not stored and cannot be shown again. Share them with the
        firm; the CA changes the password after first login.
      </p>
    </div>
  );
}
