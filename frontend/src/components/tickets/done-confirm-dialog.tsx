"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DoneConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DoneConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: DoneConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Move to Done?</DialogTitle>
          <DialogDescription>
            This will notify the Client and Manager that the ticket has been
            completed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
