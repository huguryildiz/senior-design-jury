import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDeleteConfirm } from "../useDeleteConfirm";

vi.mock("../../../shared/api", () => ({
  adminDeleteEntity: vi.fn(),
  adminDeleteCounts: vi.fn(),
}));

import { adminDeleteEntity } from "../../../shared/api";

describe("useDeleteConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSemesterDeleted and sets toast message on successful delete", async () => {
    const onSemesterDeleted = vi.fn();
    const setMessage = vi.fn();

    adminDeleteEntity.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() =>
      useDeleteConfirm({
        tenantId: "test-tenant-id",
        setMessage,
        clearAllPanelErrors: vi.fn(),
        onSemesterDeleted,
        onProjectDeleted: vi.fn(),
        onJurorDeleted: vi.fn(),
      })
    );

    await act(async () => {
      result.current.setDeleteTarget({
        type: "semester",
        id: "s1",
        label: "Semester 2025 Fall",
      });
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(onSemesterDeleted).toHaveBeenCalledWith("s1");
    expect(setMessage).toHaveBeenCalledWith("Semester 2025 Fall deleted");
  });
});
