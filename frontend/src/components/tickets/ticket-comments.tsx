"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Paperclip, X, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { addComment } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type CommentAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type CommentNode = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  attachments: CommentAttachment[];
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentView({ att }: { att: CommentAttachment }) {
  const url = `/api/files/${att.id}`;
  if (att.mimeType.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={att.fileName}
          className="max-h-48 rounded-md border object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
    >
      <FileText className="size-4 text-muted-foreground" />
      <span className="max-w-[180px] truncate">{att.fileName}</span>
      <span className="text-xs text-muted-foreground">{formatSize(att.sizeBytes)}</span>
      <Download className="size-3.5 text-muted-foreground" />
    </a>
  );
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
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!body.trim() && files.length === 0) return;
    start(async () => {
      const fd = new FormData();
      fd.append("body", body);
      if (parentId) fd.append("parentId", parentId);
      files.forEach((f) => fd.append("files", f));
      const res = await addComment(ticketId, fd);
      if (res.ok) {
        setBody("");
        setFiles([]);
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
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs"
            >
              <Paperclip className="size-3" />
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          setFiles((prev) => [...prev, ...picked].slice(0, 5));
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="size-4" />
          Attach
        </Button>
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={submit}
          disabled={pending || (!body.trim() && files.length === 0)}
        >
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
          {node.attachments.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {node.attachments.map((a) => (
                <AttachmentView key={a.id} att={a} />
              ))}
            </div>
          ) : null}
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
