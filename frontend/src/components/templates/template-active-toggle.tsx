"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power } from "lucide-react";
import { setTemplateActive } from "@/actions/templates";
import { Button } from "@/components/ui/button";

export function TemplateActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(isActive);

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await setTemplateActive(id, !active);
          if (res.ok) {
            setActive(!active);
            toast.success(!active ? "Template activated" : "Template deactivated");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      <Power className="size-4" />
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
