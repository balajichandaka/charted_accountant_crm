"use client";

import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { ClientFormDialog } from "./client-form-dialog";
import type { ClientInput } from "@/schemas/client";

export function NewClientButton() {
  return (
    <ClientFormDialog
      trigger={
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            New client
          </Button>
        </DialogTrigger>
      }
    />
  );
}

export function EditClientButton({
  client,
}: {
  client: Partial<ClientInput> & { id: string };
}) {
  return (
    <ClientFormDialog
      client={client}
      trigger={
        <DialogTrigger asChild>
          <Button variant="outline">
            <Pencil className="size-4" />
            Edit
          </Button>
        </DialogTrigger>
      }
    />
  );
}
