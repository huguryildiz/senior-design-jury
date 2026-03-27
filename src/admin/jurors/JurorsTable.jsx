// src/admin/jurors/JurorsTable.jsx
// Phase 4 — shadcn Table for jurors with actions dropdown menu.
// Receives juror data + action callbacks from ManageJurorsPanel.

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  X,
  MoreHorizontal,
  Pencil,
  KeyRound,
  Lock,
  LockOpen,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { jurorStatusMeta } from "../scoreHelpers";
import { buildTimestampSearchText, formatTs } from "../utils";

// ── Helpers ───────────────────────────────────────────────────
const toBool = (v) => v === true || v === "true" || v === "t" || v === 1;

const PAGE_SIZE = 15;

const STATUS_BADGE = {
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  ready_to_submit: { label: "Ready", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "In Progress", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  not_started: { label: "Not Started", cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  editing: { label: "Editing", cls: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

function StatusChip({ status }) {
  const v = STATUS_BADGE[status] ?? STATUS_BADGE.not_started;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", v.cls)}>
      {v.label}
    </Badge>
  );
}

function ProgressBar({ scored, total }) {
  const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
  const color =
    pct === 100
      ? "bg-emerald-500"
      : pct > 66
        ? "bg-lime-500"
        : pct > 33
          ? "bg-amber-400"
          : pct > 0
            ? "bg-orange-500"
            : "bg-muted";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {scored}/{total}
      </span>
    </div>
  );
}

// ── Juror enrichment ──────────────────────────────────────────
function getProgressMeta(j) {
  const safeTotal = Math.max(0, Number(j.overviewTotalProjects ?? j.totalProjects ?? j.total_projects ?? 0) || 0);
  const scoredRaw = Number(j.overviewScoredProjects ?? j.completedProjects ?? j.completed_projects ?? 0) || 0;
  const startedRaw = Number(j.overviewStartedProjects ?? scoredRaw) || 0;
  const scored = safeTotal > 0 ? Math.min(Math.max(scoredRaw, 0), safeTotal) : Math.max(scoredRaw, 0);
  const started = Math.max(startedRaw, scored);
  const editEnabled = toBool(j.editEnabled ?? j.edit_enabled);
  const isCompleted = Boolean(j.finalSubmittedAt ?? j.final_submitted_at);
  const hasGroups = safeTotal > 0;
  const isReadyToSubmit = hasGroups && !editEnabled && !isCompleted && scored >= safeTotal;
  const statusKey = j.overviewStatus
    || (editEnabled ? "editing"
      : isCompleted ? "completed"
        : isReadyToSubmit ? "ready_to_submit"
          : started > 0 ? "in_progress"
            : "not_started");
  return { safeTotal, scored, editEnabled, isCompleted, hasGroups, statusKey };
}

function isJurorLocked(j) {
  const lockedUntil = j.locked_until || j.lockedUntil;
  if (typeof j.is_locked === "boolean") return j.is_locked;
  if (typeof j.is_locked === "string") return j.is_locked.toLowerCase() === "true" || j.is_locked.toLowerCase() === "t";
  if (!lockedUntil) return false;
  const d = new Date(lockedUntil);
  return !Number.isNaN(d.getTime()) && d > new Date();
}

// ── Sort config ───────────────────────────────────────────────
const STATUS_ORDER = { editing: 0, in_progress: 1, ready_to_submit: 2, not_started: 3, completed: 4 };

/**
 * @param {object} props
 * @param {object[]} props.jurors
 * @param {boolean}  props.isDemoMode
 * @param {boolean}  props.evalLockActive
 * @param {boolean}  props.hasActiveSemester
 * @param {Set}      props.pendingEdits
 * @param {function} props.onEdit
 * @param {function} props.onDelete
 * @param {function} props.onResetPin
 * @param {function} props.onToggleEdit
 * @param {function} props.onForceCloseEdit
 */
export default function JurorsTable({
  jurors = [],
  isDemoMode,
  evalLockActive,
  hasActiveSemester,
  pendingEdits,
  onEdit,
  onDelete,
  onResetPin,
  onToggleEdit,
  onForceCloseEdit,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  // Enrich jurors
  const enriched = useMemo(
    () =>
      jurors.map((j) => {
        const pm = getProgressMeta(j);
        const lastActivity = j.lastActivityAt || j.last_activity_at || j.lastSeenAt || j.last_seen_at || j.updatedAt || j.updated_at || "";
        return {
          ...j,
          _name: j.juryName || j.juror_name || "",
          _dept: j.juryDept || j.juror_inst || "",
          _jurorId: j.jurorId || j.juror_id,
          _locked: isJurorLocked(j),
          _lastActivity: lastActivity,
          _lastActivityFormatted: lastActivity ? formatTs(lastActivity) : "\u2014",
          ...pm,
        };
      }),
    [jurors]
  );

  // Filter
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = enriched;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((j) => j.statusKey === statusFilter);
    }

    // Text search
    if (normalizedSearch) {
      list = list.filter((j) => {
        const statusLabel = jurorStatusMeta[j.statusKey]?.label ?? j.statusKey;
        const tsText = buildTimestampSearchText(j._lastActivity);
        const haystack = `${j._name} ${j._dept} ${statusLabel} ${j.statusKey} ${tsText}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    return list;
  }, [enriched, normalizedSearch, statusFilter]);

  // Sort
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      // Locked jurors always first
      if (a._locked !== b._locked) return Number(b._locked) - Number(a._locked);
      switch (sortKey) {
        case "name":
          return dir * a._name.localeCompare(b._name);
        case "dept":
          return dir * a._dept.localeCompare(b._dept);
        case "status":
          return dir * ((STATUS_ORDER[a.statusKey] ?? 9) - (STATUS_ORDER[b.statusKey] ?? 9));
        case "progress":
          return dir * (a.scored - b.scored);
        case "activity":
          return dir * (a._lastActivity || "").localeCompare(b._lastActivity || "");
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when filter changes
  useMemo(() => setPage(0), [normalizedSearch, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sortable header
  const SortHead = ({ id, children, className }) => (
    <TableHead
      className={cn("cursor-pointer select-none", className)}
      onClick={() => handleSort(id)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === id && (
          <span className="text-xs">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </TableHead>
  );

  // Status filter options
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "ready_to_submit", label: "Ready" },
    { value: "in_progress", label: "In Progress" },
    { value: "editing", label: "Editing" },
    { value: "not_started", label: "Not Started" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search jurors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8"
            aria-label="Search jurors"
          />
          {searchTerm && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortHead id="name">Name</SortHead>
              <SortHead id="dept" className="hidden md:table-cell">Department</SortHead>
              <SortHead id="status">Status</SortHead>
              <SortHead id="progress">Progress</SortHead>
              <SortHead id="activity" className="hidden lg:table-cell">Last Activity</SortHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {normalizedSearch || statusFilter !== "all"
                    ? "No jurors match the current filter."
                    : "No jurors found."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((j) => {
              const isPending = pendingEdits?.has(j._jurorId);
              const canUnlock = hasActiveSemester && !evalLockActive && !j.editEnabled && j.isCompleted && !isPending;
              const canLock = hasActiveSemester && j.editEnabled && !isPending;

              return (
                <TableRow key={j._jurorId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{j._name}</div>
                        <div className="text-xs text-muted-foreground truncate md:hidden">{j._dept}</div>
                      </div>
                      {j._locked && (
                        <Badge variant="outline" className="ml-1 border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]">
                          <Lock className="mr-0.5 size-2.5" />
                          PIN
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground truncate">{j._dept || "\u2014"}</span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={j.statusKey} />
                  </TableCell>
                  <TableCell>
                    <ProgressBar scored={j.scored} total={j.safeTotal} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{j._lastActivityFormatted}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            onEdit?.({
                              jurorId: j._jurorId,
                              juror_name: j._name,
                              juror_inst: j._dept,
                            })
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onResetPin?.({
                              jurorId: j._jurorId,
                              juror_name: j._name,
                              juror_inst: j._dept,
                            })
                          }
                        >
                          <KeyRound className="mr-2 size-4" />
                          Reset PIN
                        </DropdownMenuItem>

                        {/* Lock / Unlock editing */}
                        {canUnlock && (
                          <DropdownMenuItem
                            disabled={isDemoMode}
                            onClick={() => onToggleEdit?.({ jurorId: j._jurorId, enabled: true })}
                          >
                            <LockOpen className="mr-2 size-4" />
                            Unlock Editing
                          </DropdownMenuItem>
                        )}
                        {canLock && (
                          <DropdownMenuItem
                            disabled={isDemoMode}
                            onClick={() => onForceCloseEdit?.({ jurorId: j._jurorId })}
                          >
                            <Lock className="mr-2 size-4" />
                            Lock Editing
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete?.(j)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {sorted.length} juror{sorted.length !== 1 ? "s" : ""}
            {(normalizedSearch || statusFilter !== "all") && ` (filtered from ${enriched.length})`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="size-8 p-0"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs tabular-nums text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="size-8 p-0"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
