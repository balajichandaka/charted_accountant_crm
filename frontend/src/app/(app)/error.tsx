"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "The page failed to load. Try signing in again."}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Retry
        </Button>
        <Button type="button" onClick={() => window.location.assign("/login")}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
