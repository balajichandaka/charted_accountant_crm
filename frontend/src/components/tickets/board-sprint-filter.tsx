"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoardDoneToggle({ showDone }: { showDone: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function toggle() {
    const next = new URLSearchParams(params.toString());
    if (showDone) next.delete("showDone");
    else next.set("showDone", "true");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <Button variant={showDone ? "secondary" : "outline"} size="sm" onClick={toggle}>
      {showDone ? <Check className="size-4" /> : <Eye className="size-4" />}
      {showDone ? "Showing Done" : "Show Done"}
    </Button>
  );
}
