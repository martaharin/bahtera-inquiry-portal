"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface UserProfile {
  user_id: string;
  user_name: string;
  user_email: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const { loading: permissionLoading, hasPermission } = usePermissions();

  const canViewProfile = hasPermission("profile.view");
  const canEditProfile = hasPermission("profile.edit");

  const [user, setUser] = useState<UserProfile | null>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");

        const result = await res.json();

        if (result.success) {
          setUser(result.user || result.data);

          setForm({
            username: result.data?.user_name || result.user?.user_name || "",
            email: result.data?.user_email || result.user?.user_email || "",
            password: "",
            confirmPassword: "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    }

    if (permissionLoading) return;

    if (!canViewProfile) {
      router.replace("/admin/ticket");
      return;
    }

    fetchProfile();
  }, [permissionLoading, canViewProfile, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    if (user) {
      setForm({
        username: user.user_name || "",
        email: user.user_email || "",
        password: "",
        confirmPassword: "",
      });
    }

    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!canEditProfile) {
      alert("You do not have permission to edit profile.");
      return;
    }

    if (!form.username || !form.email) {
      alert("Username dan email wajib diisi");
      return;
    }

    if (
      form.password &&
      form.password !== form.confirmPassword
    ) {
      alert("Confirm password tidak cocok");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert("Profile berhasil diperbarui");

        setUser((prev) =>
          prev
            ? {
                ...prev,
                user_name: form.username,
                user_email: form.email,
              }
            : null
        );

        setForm((prev) => ({
          ...prev,
          password: "",
          confirmPassword: "",
        }));

        setIsEditing(false);
      } else {
        alert(result.error || "Gagal update profile");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan server");
    } finally {
      setSaving(false);
    }
  };

  if (permissionLoading) {
    return (
      <div className="p-8">
        Checking access...
      </div>
    );
  }

  if (!canViewProfile) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-8">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm p-8 space-y-8">

        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              Profile Settings
            </h1>

            <p className="text-sm text-gray-400 mt-2">
              Manage your account information and password.
            </p>
          </div>

          {canEditProfile && (
            !isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-3 bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-sm"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !canEditProfile}
                  className="px-5 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={handleCancel}
                  className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            )
          )}
        </div>

        {/* PROFILE FORM */}
        <div className="space-y-6">

          {/* USERNAME */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Username
            </label>

            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              disabled={!isEditing || !canEditProfile}
              className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                isEditing
                  ? "bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-orange-200"
                  : "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                isEditing
                  ? "bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-orange-200"
                  : "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder={
                isEditing
                  ? "Enter new password"
                  : "••••••••••••"
              }
              className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                isEditing
                  ? "bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-orange-200"
                  : "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            />
          </div>

          {/* CONFIRM PASSWORD */}
          {isEditing && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}