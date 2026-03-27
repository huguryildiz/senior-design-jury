// src/admin/projects/ProjectsTable.jsx
// Phase 4 — shadcn Table for projects with actions dropdown.
// Receives project data + action callbacks from ManageProjectsPanel.

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
} from "lucide-react";
import { buildTimestampSearchText, formatTs } from "../utils";

const PAGE_SIZE = 15;

/**
 * @param {object}   props
 * @param {object[]} props.projects        Sorted project list
 * @param {string}   props.semesterName    Current semester display name
 * @param {boolean}  props.isDemoMode
 * @param {function} props.onEdit          (project) => void
 * @param {function} props.onDelete        (project, groupLabel) => void
 */
export default function ProjectsTable({
  projects = [],
  semesterName,
  isDemoMode,
  onEdit,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("groupNo");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  // Enrich + normalize
  const enriched = useMemo(
    () =>
      projects.map((p) => {
        const title = p.project_title || p.name || "";
        const studentsRaw = p.group_students || p.students || "";
        const studentsList = Array.isArray(studentsRaw)
          ? studentsRaw
          : String(studentsRaw)
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean);
        const lastActivity = p.updated_at || p.updatedAt || "";
        return {
          ...p,
          _groupNo: Number(p.group_no ?? p.groupNo ?? 0),
          _title: title,
          _students: studentsList,
          _studentsText: studentsList.join(", "),
          _lastActivity: lastActivity,
          _lastActivityFormatted: lastActivity ? formatTs(lastActivity) : "\u2014",
        };
      }),
    [projects]
  );

  // Filter
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedSearch) return enriched;
    return enriched.filter((p) => {
      const tsText = buildTimestampSearchText(p._lastActivity);
      const haystack = `group ${p._groupNo} ${p._groupNo} ${p._title} ${p._studentsText} ${semesterName || ""} ${tsText}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [enriched, normalizedSearch, semesterName]);

  // Sort
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "groupNo":
          return dir * (a._groupNo - b._groupNo);
        case "title":
          return dir * a._title.localeCompare(b._title);
        case "students":
          return dir * a._studentsText.localeCompare(b._studentsText);
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useMemo(() => setPage(0), [normalizedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8"
          aria-label="Search projects"
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
              <SortHead id="groupNo" className="w-20">Group</SortHead>
              <SortHead id="title">Title</SortHead>
              <SortHead id="students" className="hidden md:table-cell">Students</SortHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {normalizedSearch ? "No projects match the current filter." : "No projects found."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((p) => {
              const groupLabel = `Group ${p._groupNo}`;
              return (
                <TableRow key={p.id || p._groupNo}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <FolderKanban className="size-4 text-muted-foreground" />
                      <span className="font-medium tabular-nums">{p._groupNo}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[300px]">{p._title || "\u2014"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[300px] md:hidden">
                        {p._studentsText || "\u2014"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground truncate block max-w-[300px]">
                      {p._studentsText || "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(p)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete?.(p, groupLabel)}
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
            {sorted.length} project{sorted.length !== 1 ? "s" : ""}
            {normalizedSearch && ` (filtered from ${enriched.length})`}
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
