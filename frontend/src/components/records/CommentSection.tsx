import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { MessageSquare, Edit2, Trash2, Check, X } from "lucide-react";
import { commentsApi } from "../../services/api";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

export function CommentSection({ recordId }: { recordId: string }) {
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["comments", recordId],
    queryFn: () => commentsApi.list(recordId),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: () => commentsApi.add(recordId, newText),
    onSuccess: () => {
      setNewText("");
      qc.invalidateQueries({ queryKey: ["comments", recordId] });
      toast.success("Note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => commentsApi.update(id, editText),
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["comments", recordId] });
      toast.success("Note updated");
    },
    onError: () => toast.error("Failed to update note"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", recordId] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  const comments: any[] = data?.data?.comments || data?.data || [];

  function startEdit(comment: any) {
    setEditingId(comment.id);
    setEditText(comment.comment_text || comment.text || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function formatTs(ts?: string) {
    if (!ts) return "";
    try { return format(parseISO(ts), "MMM d, yyyy · h:mm a"); } catch { return ts; }
  }

  function isEdited(comment: any) {
    return comment.updated_at && comment.created_at && comment.updated_at !== comment.created_at;
  }

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-slate-400" />
        <h3 className="text-sm font-bold text-slate-700">My Notes</h3>
        {comments.length > 0 && (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {/* Existing comments */}
      {isLoading ? (
        <div className="space-y-2 mb-4">
          {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((comment: any) => (
            <div key={comment.id} className="bg-slate-50 rounded-xl p-4">
              {editingId === comment.id ? (
                /* Edit mode */
                <div>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    className="hw-input resize-none mb-2 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate(comment.id)}
                      disabled={!editText.trim() || updateMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand-blue text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={11} />
                      {updateMutation.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <X size={11} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {comment.comment_text || comment.text}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {formatTs(comment.created_at)}
                      </span>
                      {isEdited(comment) && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                          edited
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(comment)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        )}
                        title="Edit note"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(comment.id)}
                        disabled={deleteMutation.isPending}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50"
                        )}
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <textarea
        value={newText}
        onChange={e => setNewText(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="hw-input min-h-[80px] resize-none mb-2 text-sm"
      />
      <button
        onClick={() => addMutation.mutate()}
        disabled={!newText.trim() || addMutation.isPending}
        className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
      >
        {addMutation.isPending ? "Saving…" : "Save Note"}
      </button>
    </div>
  );
}
