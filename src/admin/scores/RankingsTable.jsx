// src/admin/scores/RankingsTable.jsx
// Phase 4 — shadcn Table for project rankings with dynamic criteria columns.
// Columns adapt to the active semester's criteria template.

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
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { CRITERIA, TOTAL_MAX } from "../../config";
import { readSection, writeSection } from "../persist";
import { exportRankingsXLSX } from "../xlsx/exportXLSX";
import { useAuth } from "../../shared/auth";
import medalFirst from "../../assets/1st-place-medal.svg";
import medalSecond from "../../assets/2nd-place-medal.svg";
import medalThird from "../../assets/3rd-place-medal.svg";

const CRITERIA_LIST = CRITERIA.map((c) => ({
  id: c.id,
  label: c.label,
  shortLabel: c.shortLabel,
  max: c.max,
  color: c.color,
}));

const MEDALS = [medalFirst, medalSecond, medalThird];
const PAGE_SIZE = 20;

function formatScore(val, digits = 1) {
  if (!Number.isFinite(val)) return "\u2014";
  return Number(val).toFixed(digits);
}

function MedalBadge({ rank }) {
  if (rank >= 1 && rank <= 3) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={MEDALS[rank - 1]}
          alt={`${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : "rd"} place`}
          className="size-6"
        />
      </div>
    );
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground">
      {rank ?? "\u2014"}
    </span>
  );
}

function CriterionBar({ value, max, color }) {
  const pct = max > 0 && Number.isFinite(value) ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {formatScore(value)}
      </span>
    </div>
  );
}

/**
 * @param {object[]} props.ranked             Sorted project summaries
 * @param {string}   props.semesterName       Current semester name
 * @param {object[]} [props.criteriaTemplate] Active criteria (falls back to CRITERIA)
 */
export default function RankingsTable({
  ranked = [],
  semesterName,
  criteriaTemplate,
}) {
  const { activeTenant } = useAuth();

  // Resolve criteria
  const criteriaList = useMemo(
    () =>
      (criteriaTemplate || CRITERIA_LIST).map((c) => ({
        id: c.id ?? c.key,
        label: c.label,
        shortLabel: c.shortLabel,
        max: c.max,
        color: c.color,
      })),
    [criteriaTemplate]
  );

  const totalMax = useMemo(
    () => criteriaList.reduce((sum, c) => sum + (c.max || 0), 0) || TOTAL_MAX,
    [criteriaList]
  );

  // Persisted sort
  const [sortKey, setSortKey] = useState(() => {
    const saved = readSection("rankings");
    return saved?.sortKey || "totalAvg";
  });
  const [sortDir, setSortDir] = useState(() => {
    const saved = readSection("rankings");
    return saved?.sortDir || "desc";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleSort = useCallback(
    (key) => {
      let newDir;
      if (sortKey === key) {
        newDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        newDir = key === "totalAvg" || criteriaList.some((c) => c.id === key) ? "desc" : "asc";
        setSortKey(key);
      }
      setSortDir(newDir);
      writeSection("rankings", { sortKey: sortKey === key ? key : key, sortDir: newDir });
      if (sortKey === key) setSortDir(newDir);
      else setSortKey(key);
    },
    [sortKey, sortDir, criteriaList]
  );

  // Filter to scored only + search
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = ranked.filter((p) => Number.isFinite(p.totalAvg));
    if (normalizedSearch) {
      list = list.filter((p) => {
        const haystack = `group ${p.groupNo} ${p.groupNo} ${p.name || ""} ${p.students || ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [ranked, normalizedSearch]);

  // Sort
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const getVal = (p) => {
        if (sortKey === "totalAvg") return p.totalAvg ?? -Infinity;
        if (sortKey === "groupNo") return p.groupNo ?? 0;
        if (sortKey === "projectTitle") return (p.name || "").toLowerCase();
        // Criterion key
        const av = p.avg?.[sortKey];
        return typeof av === "number" ? av : -Infinity;
      };
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "string" && typeof bv === "string") return dir * av.localeCompare(bv);
      return dir * ((av > bv ? 1 : av < bv ? -1 : 0));
    });
  }, [filtered, sortKey, sortDir]);

  // Rank map (tie-aware)
  const rankMap = useMemo(() => {
    const byTotal = [...filtered].sort(
      (a, b) => (b.totalAvg ?? -Infinity) - (a.totalAvg ?? -Infinity)
    );
    const map = new Map();
    let rank = 1;
    for (let i = 0; i < byTotal.length; i++) {
      if (i > 0 && byTotal[i].totalAvg !== byTotal[i - 1].totalAvg) {
        rank = i + 1;
      }
      const key = byTotal[i].id ?? byTotal[i].groupNo ?? i;
      map.set(key, rank);
    }
    return map;
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useMemo(() => setPage(0), [normalizedSearch, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Export
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportRankingsXLSX(sorted, criteriaList, {
        semesterName,
        tenantCode: activeTenant?.code,
      });
    } finally {
      setExporting(false);
    }
  };

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

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8"
            aria-label="Search rankings"
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || sorted.length === 0}
        >
          <Download className="mr-1.5 size-4" />
          {exporting ? "Exporting\u2026" : "Excel"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">Rank</TableHead>
              <SortHead id="groupNo" className="w-16">Group</SortHead>
              <SortHead id="projectTitle">Project</SortHead>
              {criteriaList.map((c) => (
                <SortHead key={c.id} id={c.id} className="hidden lg:table-cell">
                  <span
                    className="inline-block size-2 rounded-full mr-1"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.shortLabel || c.label}
                </SortHead>
              ))}
              <SortHead id="totalAvg" className="text-right">Total</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4 + criteriaList.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  {normalizedSearch
                    ? "No projects match the current filter."
                    : "No scored projects yet."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((p, idx) => {
              const key = p.id ?? p.groupNo ?? idx;
              const rank = rankMap.get(key);
              const studentList = p.students
                ? p.students.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <TableRow key={key} className={rank <= 3 ? "bg-amber-500/[0.03]" : ""}>
                  <TableCell className="text-center">
                    <MedalBadge rank={rank} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium tabular-nums">{p.groupNo}</span>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[250px]">
                        {p.name || `Group ${p.groupNo}`}
                      </div>
                      {studentList.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {studentList.join(" \u00b7 ")}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {criteriaList.map((c) => (
                    <TableCell key={c.id} className="hidden lg:table-cell">
                      <CriterionBar
                        value={p.avg?.[c.id]}
                        max={c.max}
                        color={c.color}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "tabular-nums font-medium",
                        rank === 1
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                          : rank === 2
                            ? "border-zinc-400/30 bg-zinc-400/10 text-zinc-600"
                            : rank === 3
                              ? "border-orange-500/30 bg-orange-500/10 text-orange-600"
                              : ""
                      )}
                    >
                      {formatScore(p.totalAvg)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {sorted.length} project{sorted.length !== 1 ? "s" : ""} scored
          {normalizedSearch && ` (filtered from ${filtered.length})`}
        </span>
        {totalPages > 1 && (
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
        )}
      </div>
    </div>
  );
}
