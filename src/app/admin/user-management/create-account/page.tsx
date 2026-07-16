"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

type RoleItem = {
  role_id: string | number;
  role_name: string;
};

type BranchIndustryItem = {
  id?: string | number;
  branch_id?: string | number;
  industry_id?: string | number;
  branch_name?: string;
  industry_name?: string;
  industries?: {
    industry_id: string | number;
    industry_name: string;
  }[];
};

type FlatBranchIndustryItem = {
  id: string;
  branch_id: string | number;
  branch_name: string;
  industry_id: string | number;
  industry_name: string;
};

export default function CreateAccountPage() {
  const router = useRouter();

  const { loading: permissionLoading, hasPermission } = usePermissions();
  const canCreateUser = hasPermission("user.create");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    branches: [] as string[],
    industries: [] as string[],
  });

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [branchIndustryList, setBranchIndustryList] = useState<
    FlatBranchIndustryItem[]
  >([]);

  const [saving, setSaving] = useState(false);

  const selectedBranch = formData.branches[0] || "";
  const selectedIndustry = formData.industries[0] || "";

  useEffect(() => {
    if (permissionLoading) return;

    if (!canCreateUser) {
      router.replace("/admin/user-management");
      return;
    }

    fetchRoles();
    fetchBranchIndustry();
  }, [permissionLoading, canCreateUser, router]);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error("FETCH ROLES ERROR:", error);
    }
  };

  const fetchBranchIndustry = async () => {
    try {
      const response = await fetch("/api/branch-industry", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!data.success) {
        console.error("FETCH BRANCH INDUSTRY ERROR:", data.error);
        return;
      }

      const rawData: BranchIndustryItem[] = data.data || [];

      const flattenedData: FlatBranchIndustryItem[] = rawData.flatMap(
        (branchItem) => {
          if (Array.isArray(branchItem.industries)) {
            return branchItem.industries.map((industryItem) => ({
              id: `${branchItem.branch_id}-${industryItem.industry_id}`,
              branch_id: branchItem.branch_id || "",
              branch_name: branchItem.branch_name || "",
              industry_id: industryItem.industry_id,
              industry_name: industryItem.industry_name,
            }));
          }

          return [
            {
              id: `${branchItem.branch_id}-${branchItem.industry_id}`,
              branch_id: branchItem.branch_id || "",
              branch_name: branchItem.branch_name || "",
              industry_id: branchItem.industry_id || "",
              industry_name: branchItem.industry_name || "",
            },
          ];
        }
      );

      setBranchIndustryList(flattenedData);
    } catch (error) {
      console.error("FETCH BRANCH INDUSTRY ERROR:", error);
    }
  };

  const branchOptions = useMemo(() => {
    const uniqueBranches = new Set<string>();

    branchIndustryList.forEach((item) => {
      if (item.branch_name) {
        uniqueBranches.add(item.branch_name.trim());
      }
    });

    return Array.from(uniqueBranches);
  }, [branchIndustryList]);

  const industryOptions = useMemo(() => {
    const uniqueIndustries = new Set<string>();

    branchIndustryList
      .filter((item) => item.branch_name.trim() === selectedBranch)
      .forEach((item) => {
        if (item.industry_name) {
          uniqueIndustries.add(item.industry_name.trim());
        }
      });

    return Array.from(uniqueIndustries);
  }, [branchIndustryList, selectedBranch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      branches: value ? [value] : [],
      industries: [],
    }));
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      industries: value ? [value] : [],
    }));
  };

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canCreateUser) {
      alert("You do not have permission to create users.");
      return;
    }

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.role ||
      !selectedBranch ||
      !selectedIndustry
    ) {
      alert("Please complete all fields");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/user-management/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert("Account created successfully!");
        router.push("/admin/user-management");
        router.refresh();
      } else {
        alert(data.message || data.error || "Failed to create account");
      }
    } catch (error) {
      console.error("CREATE ACCOUNT ERROR:", error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (permissionLoading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-[920px] rounded-[28px] border border-gray-100 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-gray-400">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (!canCreateUser) {
    return null;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-[920px]">
        <button
          type="button"
          onClick={() => router.push("/admin/user-management")}
          className="mb-4 cursor-pointer text-sm font-bold text-orange-500 transition hover:text-orange-600"
        >
          ← Back to User Management
        </button>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h1 className="text-[28px] font-black uppercase tracking-wide text-gray-950">
              Create Account
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-400">
              Create new user account for the system.
            </p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Username
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter username"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                required
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Role
                </label>

                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Select role</option>

                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Branch
                </label>

                <select
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Select branch</option>

                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Business Unit
                </label>

                <select
                  value={selectedIndustry}
                  onChange={handleIndustryChange}
                  disabled={!selectedBranch}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:text-gray-300"
                  required
                >
                  <option value="">
                    {selectedBranch ? "Select industry" : "Select branch first"}
                  </option>

                  {industryOptions.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/admin/user-management")}
                className="h-11 rounded-2xl border border-gray-200 px-6 text-sm font-black text-gray-500 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !canCreateUser}
                className="h-11 rounded-2xl bg-orange-500 px-7 text-sm font-black uppercase tracking-widest text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}