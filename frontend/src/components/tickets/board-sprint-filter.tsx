"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
      {showDone ? "Hiding Done" : "Show Done"}
    </Button>
  );
}
