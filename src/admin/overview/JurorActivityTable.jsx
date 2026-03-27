// src/admin/overview/JurorActivityTable.jsx
// Restyled JurorActivity using shadcn Table + Tailwind.
// Same props interface as JurorActivity.jsx — drop-in replacement.

import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Clock,
  User,
  Building2,
  FolderKanban,
  FileText,
  Users,
} from "lucide-react";
import { formatTs, adminCompletionPct, cmp } from "../utils";
import { readSection, writeSection } from "../persist";
import { getCellState, getPartialTotal, jurorStatusMeta } from "../scoreHelpers";

// ── Status badge variant mapping ──────────────────────────────
const STATUS_VARIANT = {
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  ready_to_submit: { label: "Ready", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  not_started: { label: "Not Started", className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  editing: { label: "Editing", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  scored: { label: "Scored", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  partial: { label: "Partial", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  empty: { label: "Empty", className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
};

function StatusBadgeStyled({ status }) {
  const v = STATUS_VARIANT[status] ?? STATUS_VARIANT.not_started;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", v.className)}>
      {v.label}
    </Badge>
  );
}

// ── Sort helpers ──────────────────────────────────────────────
const SORT_KEYS = ["name", "dept", "status", "progress", "activity"];
const SORT_LABELS = {
  name: "Name",
  dept: "Department",
  status: "Status",
  progress: "Progress",
  activity: "Last Activity",
};

const STATUS_ORDER = {
  editing: 0,
  in_progress: 1,
  ready_to_submit: 2,
  not_started: 3,
  completed: 4,
};

function getOverallStatus(stat, groupCount) {
  const isEditing = !!stat.editEnabled;
  const isFinal = !!stat.latestRow?.finalSubmittedAt;
  const scoredCount = (stat.rows || []).filter(
    (d) => d.total !== null && d.total !== undefined
  ).length;
  const startedCount = (stat.rows || []).filter(
    (d) => getCellState(d) !== "empty"
  ).length;
  return isEditing
    ? "editing"
    : isFinal
      ? "completed"
      : scoredCount === groupCount && groupCount > 0
        ? "ready_to_submit"
        : startedCount > 0
          ? "in_progress"
          : "not_started";
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ pct }) {
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
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ── Expanded group row ────────────────────────────────────────
function GroupDetailRow({ row, isOpen, onToggle }) {
  const hasDetails = Boolean(row.projectTitle) || row.students.length > 0;
  const scoreLabel = Number.isFinite(row.score) ? row.score : "\u2014";

  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/50">
        <TableCell className="pl-10">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm"
            onClick={hasDetails ? onToggle : undefined}
            disabled={!hasDetails}
          >
            {hasDetails ? (
              isOpen ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )
            ) : (
              <span className="size-3.5" />
            )}
            <FolderKanban className="size-3.5 text-muted-foreground" />
            <span>{row.label}</span>
          </button>
        </TableCell>
        <TableCell />
        <TableCell>
          <StatusBadgeStyled status={row.state} />
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              row.state === "scored"
                ? "text-foreground"
                : row.state === "partial"
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            )}
          >
            {scoreLabel}
          </span>
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {row.updatedAt}
          </span>
        </TableCell>
      </TableRow>
      {isOpen && hasDetails && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={5} className="pl-16 py-2">
            <div className="space-y-1 text-xs text-muted-foreground">
              {row.projectTitle && (
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3" />
                  <span>{row.projectTitle}</span>
                </div>
              )}
              {row.students.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="size-3" />
                  <span>{row.students.join(" \u00b7 ")}</span>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export default function JurorActivityTable({ jurorStats = [], groups = [] }) {
  // Search state — persisted to localStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    const s = readSection("jurors");
    return typeof s.searchTerm === "string" ? s.searchTerm : "";
  });
  useEffect(() => {
    writeSection("jurors", { searchTerm });
  }, [searchTerm]);

  // Sort state
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Expanded state
  const [expandedJurors, setExpandedJurors] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const toggleJuror = useCallback((key) => {
    setExpandedJurors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((jurorKey, groupId) => {
    const gk = `${jurorKey}-${groupId}`;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gk)) next.delete(gk);
      else next.add(gk);
      return next;
    });
  }, []);

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  // Filter + sort
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const processed = useMemo(() => {
    let list = jurorStats.map((stat) => ({
      ...stat,
      _status: getOverallStatus(stat, groups.length),
      _pct: adminCompletionPct(stat.rows, groups.length),
      _dept: String(stat.latestRow?.juryDept || stat.dept || "").trim(),
      _lastActivity:
        stat.latestRow?.finalSubmittedAt || stat.latestRow?.updatedAt || "",
    }));

    // Filter
    if (normalizedSearch) {
      list = list.filter((s) => {
        const statusLabel =
          jurorStatusMeta[s._status]?.label ?? s._status;
        const haystack =
          `${s.jury} ${s._dept} ${s._status} ${statusLabel}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * cmp(a.jury, b.jury);
        case "dept":
          return dir * cmp(a._dept, b._dept);
        case "status":
          return (
            dir *
            ((STATUS_ORDER[a._status] ?? 9) - (STATUS_ORDER[b._status] ?? 9))
          );
        case "progress":
          return dir * (a._pct - b._pct);
        case "activity":
          return dir * cmp(a._lastActivity, b._lastActivity);
        default:
          return 0;
      }
    });

    return list;
  }, [jurorStats, groups.length, normalizedSearch, sortKey, sortDir]);

  // Build per-group rows for a juror
  const buildGroupRows = useCallback(
    (stat) => {
      const rowMap = new Map((stat.rows || []).map((r) => [r.projectId, r]));
      return groups.map((g) => {
        const row = rowMap.get(g.id);
        const projectTitle = String(g.title ?? g.project_title ?? "").trim();
        const studentsList = Array.isArray(g.students)
          ? g.students
          : String(g.students ?? "")
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean);
        const updatedAtRaw =
          row?.updatedAt || row?.updated_at || row?.timestamp || "";
        const entry = row || {
          projectId: g.id,
          groupNo: g.groupNo,
          total: null,
          technical: null,
          design: null,
          delivery: null,
          teamwork: null,
        };
        const state = getCellState(entry);
        const scoreValue =
          state === "scored"
            ? Number(entry.total)
            : state === "partial"
              ? getPartialTotal(entry)
              : null;
        return {
          id: g.id,
          label: g.label || `Group ${g.groupNo}`,
          projectTitle,
          students: studentsList,
          updatedAt: updatedAtRaw ? formatTs(updatedAtRaw) : "\u2014",
          state,
          score: scoreValue,
        };
      });
    },
    [groups]
  );

  // Column header with sort
  const SortableHead = ({ sortId, children, className }) => (
    <TableHead
      className={cn("cursor-pointer select-none", className)}
      onClick={() => handleSort(sortId)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === sortId && (
          <span className="text-xs">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-sm">
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

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead sortId="name">Juror</SortableHead>
              <SortableHead sortId="dept">Dept</SortableHead>
              <SortableHead sortId="status">Status</SortableHead>
              <SortableHead sortId="progress">Progress</SortableHead>
              <SortableHead sortId="activity">Last Activity</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No jurors match the current filter.
                </TableCell>
              </TableRow>
            )}
            {processed.map((stat) => {
              const isExpanded = expandedJurors.has(stat.key);
              const lastActivity =
                stat._lastActivity ? formatTs(stat._lastActivity) : "\u2014";
              const perGroupRows = isExpanded ? buildGroupRows(stat) : [];

              return [
                <TableRow
                  key={stat.key}
                  className={cn(
                    "cursor-pointer",
                    isExpanded && "bg-muted/30"
                  )}
                  onClick={() => toggleJuror(stat.key)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {groups.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <span className="size-4" />
                      )}
                      <User className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{stat.jury}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      {stat._dept || "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadgeStyled status={stat._status} />
                  </TableCell>
                  <TableCell>
                    <ProgressBar pct={stat._pct} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {lastActivity}
                    </span>
                  </TableCell>
                </TableRow>,
                ...(isExpanded
                  ? perGroupRows.map((row) => (
                      <GroupDetailRow
                        key={`${stat.key}-${row.id}`}
                        row={row}
                        isOpen={expandedGroups.has(`${stat.key}-${row.id}`)}
                        onToggle={() => toggleGroup(stat.key, row.id)}
                      />
                    ))
                  : []),
              ];
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
