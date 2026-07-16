"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface IndustryItem {
  industry_id: string;
  industry_name: string;
}

interface BranchItem {
  branch_id: string;
  branch_name: string;
  industries: IndustryItem[];
}

export default function BranchIndustryPage() {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const { loading: permissionLoading, hasPermission } = usePermissions();

  const canViewBranchIndustry = hasPermission("branch_industry.view");
  const canCreateBranchIndustry = hasPermission("branch_industry.create");
  const canDeleteBranchIndustry = hasPermission("branch_industry.delete");

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);

  const [branchName, setBranchName] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [industryName, setIndustryName] = useState("");

  const fetchBranchIndustry = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/branch-industry");
      const result = await res.json();

      if (result.success) {
        setBranches(result.data || []);
      } else {
        setError(result.error || "Gagal mengambil data branch dan industry");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mengambil data branch dan industry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissionLoading) return;

    if (!canViewBranchIndustry) {
      router.replace("/admin/ticket");
      return;
    }

    fetchBranchIndustry();
  }, [permissionLoading, canViewBranchIndustry, router]);

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  const resetBranchModal = () => {
    setBranchName("");
    setShowBranchModal(false);
  };

  const resetIndustryModal = () => {
    setSelectedBranchId("");
    setIndustryName("");
    setShowIndustryModal(false);
  };

  const handleAddBranch = async () => {
    if (!canCreateBranchIndustry) {
      alert("You do not have permission to create branch or business unit.");
      return;
    }

    if (!branchName.trim()) {
      alert("Branch name wajib diisi");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/branch-industry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_branch",
          branch_name: branchName,
        }),
      });

      const result = await res.json();

      if (result.success) {
        resetBranchModal();
        fetchBranchIndustry();
      } else {
        alert(result.error || "Gagal menambahkan branch");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan branch");
    } finally {
      setSaving(false);
    }
  };

  const handleAddIndustryToBranch = async () => {
    if (!canCreateBranchIndustry) {
      alert("You do not have permission to create branch or business unit.");
      return;
    }

    if (!selectedBranchId) {
      alert("Branch wajib dipilih");
      return;
    }

    if (!industryName.trim()) {
      alert("Business Unit name wajib diisi");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/branch-industry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_industry_to_branch",
          branch_id: selectedBranchId,
          industry_name: industryName,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setExpandedBranches((prev) => ({
          ...prev,
          [selectedBranchId]: true,
        }));

        resetIndustryModal();
        fetchBranchIndustry();
      } else {
        alert(result.error || "Gagal menambahkan industry ke branch");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan industry");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branch: BranchItem) => {
    if (!canDeleteBranchIndustry) {
      alert("You do not have permission to delete branch or business unit.");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete branch "${branch.branch_name}"? Semua relasi industry di branch ini juga akan terhapus.`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `/api/branch-industry?type=branch&branch_id=${branch.branch_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await res.json();

      if (result.success) {
        fetchBranchIndustry();
      } else {
        alert(result.error || "Gagal menghapus branch");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus branch");
    }
  };

  const handleDeleteIndustryRelation = async (
    branchId: string,
    industry: IndustryItem
  ) => {
    if (!canDeleteBranchIndustry) {
      alert("You do not have permission to delete branch or business unit.");
      return;
    }

    const confirmDelete = window.confirm(
      `Remove Business Unit "${industry.industry_name}" from this branch?`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `/api/branch-industry?type=relation&branch_id=${branchId}&industry_id=${industry.industry_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await res.json();

      if (result.success) {
        fetchBranchIndustry();
      } else {
        alert(result.error || "Gagal menghapus Business Unit dari branch");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus Business Unit dari branch");
    }
  };

  if (permissionLoading || loading) {
    return (
      <div className="p-8 text-sm font-medium text-gray-500">
        Loading branch and Business Unit data...
      </div>
    );
  }

  if (!canViewBranchIndustry) {
    return null;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/admin/ticket"
        className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-all mb-6"
      >
        Back
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            Branch & Business Unit
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Manage branch and Business Unit mapping for ticket assignment.
          </p>
        </div>

        {canCreateBranchIndustry && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowBranchModal(true)}
              className="px-5 py-3 bg-white text-orange-600 border border-orange-100 rounded-2xl text-sm font-black shadow-sm hover:bg-orange-50 transition-all cursor-pointer"
            >
              Add Branch
            </button>

            <button
              onClick={() => setShowIndustryModal(true)}
              className="px-5 py-3 bg-orange-500 text-white rounded-2xl text-sm font-black shadow-sm hover:bg-orange-600 transition-all cursor-pointer"
            >
              Add Business Unit to Branch
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-100 px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Branch</div>
          <div className="col-span-3">Total Business Unit</div>
          <div className="col-span-4 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-8 text-sm font-medium text-gray-500">
            Loading branch and Business Unit data...
          </div>
        ) : error ? (
          <div className="p-8 text-sm font-medium text-red-500">
            {error}
          </div>
        ) : branches.length === 0 ? (
          <div className="p-8 text-sm font-medium text-gray-500">
            No branch data found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {branches.map((branch) => {
              const isExpanded = expandedBranches[branch.branch_id];

              return (
                <div key={branch.branch_id}>
                  <div className="grid grid-cols-12 items-center px-5 py-4 hover:bg-gray-50 transition-all">
                    <div className="col-span-5">
                      <p className="text-sm font-black text-gray-900">
                        {branch.branch_name}
                      </p>
                    </div>

                    <div className="col-span-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                        {branch.industries.length}{" "}
                        {branch.industries.length === 1
                          ? "industry"
                          : "industries"}
                      </span>
                    </div>

                    <div className="col-span-4 flex justify-end items-center gap-2">
                      <button
                        onClick={() => toggleBranch(branch.branch_id)}
                        className="px-4 py-2 rounded-xl text-xs font-black text-orange-600 bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer"
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>

                      {canDeleteBranchIndustry && (
                        <button
                          onClick={() => handleDeleteBranch(branch)}
                          className="px-4 py-2 rounded-xl text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                  </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                      {branch.industries.length === 0 ? (
                        <div className="text-sm text-gray-400 italic">
                          No Business Unit added to this branch yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {branch.industries.map((industry) => (
                            <div
                              key={`${branch.branch_id}-${industry.industry_id}`}
                              className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-sm font-bold text-gray-700">
                                  {industry.industry_name}
                                </span>
                              </div>

                              {canDeleteBranchIndustry && (
                                <button
                                  onClick={() =>
                                    handleDeleteIndustryRelation(branch.branch_id, industry)
                                  }
                                  className="text-xs font-black text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-[28px] shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-black text-gray-900 mb-2">
              Add Branch
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Add a new branch for sales assignment.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Branch Name
              </label>

              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Example: Jakarta"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                onClick={resetBranchModal}
                disabled={saving}
                className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-black hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleAddBranch}
                disabled={saving}
                className="px-5 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIndustryModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-[28px] shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-black text-gray-900 mb-2">
              Add Business Unit to Branch
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Choose a branch, then add the Business Unit handled by that branch.
            </p>

            <div className="space-y-5 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Branch
                </label>

                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Business Unit Name
                </label>

                <input
                  type="text"
                  value={industryName}
                  onChange={(e) => setIndustryName(e.target.value)}
                  placeholder="Example: Healthcare"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                onClick={resetIndustryModal}
                disabled={saving}
                className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-black hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleAddIndustryToBranch}
                disabled={saving}
                className="px-5 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Industry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}