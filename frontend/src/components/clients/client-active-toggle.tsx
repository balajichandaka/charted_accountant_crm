"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { setClientActive } from "@/actions/clients";
import { Button } from "@/components/ui/button";

export function ClientActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(isActive);

  function toggle() {
    startTransition(async () => {
      const res = await setClientActive(id, !active);
      if (res.ok) {
        setActive(!active);
        toast.success(!active ? "Client activated" : "Client deactivated");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={pending}>
      <Power className="size-4" />
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
