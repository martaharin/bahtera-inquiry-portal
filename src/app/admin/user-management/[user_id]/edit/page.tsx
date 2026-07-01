"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type EditUserForm = {
  username: string;
  email: string;
  role_name: string;
  industry: string;
  branch: string;
};

type BranchIndustryItem = {
  id?: string | number;
  branch_id?: string | number;
  industry_id?: string | number;

  branch?: string | {
    id?: string | number;
    name?: string;
    branch_name?: string;
  };

  industry?: string | {
    id?: string | number;
    name?: string;
    industry_name?: string;
  };

  branch_name?: string;
  industry_name?: string;
};

export default function EditUserPage() {
  const router = useRouter();
  const { user_id } = useParams<{ user_id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [branchIndustryList, setBranchIndustryList] = useState<
    BranchIndustryItem[]
  >([]);

  const [form, setForm] = useState<EditUserForm>({
    username: "",
    email: "",
    role_name: "",
    industry: "",
    branch: "",
  });

  const getIndustryName = (item: BranchIndustryItem) => {
    if (typeof item.industry === "string") return item.industry.trim();

    return (
      item.industry?.industry_name ||
      item.industry?.name ||
      item.industry_name ||
      ""
    ).trim();
  };

  const getBranchName = (item: BranchIndustryItem) => {
    if (typeof item.branch === "string") return item.branch.trim();

    return (
      item.branch?.branch_name ||
      item.branch?.name ||
      item.branch_name ||
      ""
    ).trim();
  };

  const branchOptions = useMemo(() => {
    const uniqueBranches = new Set<string>();

    branchIndustryList.forEach((item) => {
      const branchName = getBranchName(item).trim();

      if (branchName) {
        uniqueBranches.add(branchName);
      }
    });

    return Array.from(uniqueBranches);
  }, [branchIndustryList]);

  const industryOptions = useMemo(() => {
    const uniqueIndustries = new Set<string>();

    branchIndustryList
      .filter((item) => getBranchName(item).trim() === form.branch)
      .forEach((item) => {
        const industryName = getIndustryName(item).trim();

        if (industryName) {
          uniqueIndustries.add(industryName);
        }
      });

    return Array.from(uniqueIndustries);
  }, [branchIndustryList, form.branch]);

  const readApiResponse = async (res: Response) => {
    const text = await res.text();

    if (!text) {
      console.error("EMPTY API RESPONSE:", {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
      });

      return {
        success: false,
        error: `Empty response from ${res.url}`,
      };
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("INVALID JSON RESPONSE:", {
        url: res.url,
        status: res.status,
        text,
      });

      return {
        success: false,
        error: "Invalid JSON response",
      };
    }
  };

  useEffect(() => {
    async function fetchEditData() {
      try {
        setLoading(true);

        const [userRes, branchIndustryRes] = await Promise.all([
          fetch(`/api/user-management/${user_id}`, {
            cache: "no-store",
          }),
          fetch("/api/branch-industry", {
            cache: "no-store",
          }),
        ]);

        const userResult = await readApiResponse(userRes);
        const branchIndustryResult = await readApiResponse(branchIndustryRes);

        if (!userRes.ok || !userResult.success) {
          console.error("USER API FAILED:", {
            status: userRes.status,
            result: userResult,
          });

          alert(userResult.error || "Failed to load user");
          router.push("/admin/user-management");
          return;
        }

        if (!branchIndustryRes.ok || !branchIndustryResult.success) {
          console.error("BRANCH INDUSTRY API FAILED:", {
            status: branchIndustryRes.status,
            result: branchIndustryResult,
          });

          alert(branchIndustryResult.error || "Failed to load branch and industry");
          return;
        }

        const rawBranchIndustryData = Array.isArray(branchIndustryResult)
          ? branchIndustryResult
          : branchIndustryResult.data ||
            branchIndustryResult.branch_industry ||
            branchIndustryResult.branchIndustry ||
            branchIndustryResult.branch_industries ||
            branchIndustryResult.items ||
            [];

        const branchIndustryData: BranchIndustryItem[] =
          rawBranchIndustryData.flatMap((branchItem: any) => {
            if (Array.isArray(branchItem.industries)) {
              return branchItem.industries.map((industryItem: any) => ({
                id: `${branchItem.branch_id}-${industryItem.industry_id}`,
                branch_id: branchItem.branch_id,
                branch_name: branchItem.branch_name,
                industry_id: industryItem.industry_id,
                industry_name: industryItem.industry_name,
              }));
            }

            return [branchItem];
          });

        console.log("branchIndustryData:", branchIndustryData);

        setBranchIndustryList(branchIndustryData);

        setForm({
          username: userResult.user.user_name || "",
          email: userResult.user.user_email || "",
          role_name: userResult.user.role_name || "",
          industry: userResult.user.industry || "",
          branch: userResult.user.branch || "",
        });
      } catch (error) {
        console.error("Fetch edit user error:", error);
        alert("Failed to load edit user data");
      } finally {
        setLoading(false);
      }
    }

    if (user_id) {
      fetchEditData();
    }
  }, [user_id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "branch") {
        return {
          ...prev,
          branch: value,
          industry: "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username || !form.email || !form.role_name || !form.industry || !form.branch) {
      alert("Please complete all fields");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/user-management/${user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (result.success) {
        alert("User updated successfully");
        router.push("/admin/user-management");
        router.refresh();
      } else {
        alert(result.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Update user error:", error);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-[920px] rounded-[28px] border border-gray-100 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-gray-400">
            Loading user data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-[920px]">
        <button
          onClick={() => router.push("/admin/user-management")}
          className="mb-4 cursor-pointer text-sm font-bold text-orange-500 transition hover:text-orange-600"
        >
          ← Back to User Management
        </button>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h1 className="text-[28px] font-black tracking-tight text-gray-950">
              Edit User
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-400">
              Update account information.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Username
              </label>

              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Email
              </label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Role
                </label>

                <select
                  name="role_name"
                  value={form.role_name}
                  onChange={handleChange}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Select role</option>
                  <option value="admin">Admin</option>
                  <option value="head sales">Head Sales</option>
                  <option value="sales staff">Sales Staff</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Branch
                </label>

                <select
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
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
                  Industry
                </label>

                <select
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  disabled={!form.branch}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <option value="">
                    {form.branch ? "Select industry" : "Select branch first"}
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
                disabled={saving}
                className="h-11 rounded-2xl bg-orange-500 px-7 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}