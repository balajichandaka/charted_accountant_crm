"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addComment } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type CommentNode = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  replies: CommentNode[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CommentForm({
  ticketId,
  parentId,
  onDone,
  compact,
}: {
  ticketId: string;
  parentId?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!body.trim()) return;
    start(async () => {
      const res = await addComment(ticketId, body, parentId);
      if (res.ok) {
        setBody("");
        onDone?.();
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={compact ? 2 : 3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
      />
      <div className="flex justify-end gap-2">
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  node,
  ticketId,
}: {
  node: CommentNode;
  ticketId: string;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {initials(node.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-sm font-medium">{node.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(node.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{node.body}</p>
        </div>
        <button
          onClick={() => setReplying((r) => !r)}
          className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Reply
        </button>
        {replying ? (
          <div className="mt-2">
            <CommentForm
              ticketId={ticketId}
              parentId={node.id}
              compact
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}
        {node.replies.length > 0 ? (
          <div className="mt-3 space-y-3 border-l pl-3">
            {node.replies.map((r) => (
              <CommentItem key={r.id} node={r} ticketId={ticketId} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TicketComments({
  ticketId,
  comments,
}: {
  ticketId: string;
  comments: CommentNode[];
}) {
  return (
    <div className="space-y-5">
      <CommentForm ticketId={ticketId} />
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} node={c} ticketId={ticketId} />
          ))}
        </div>
      )}
    </div>
  );
}
