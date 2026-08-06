"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password updated successfully");

        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-6">
      <div className="w-full max-w-[450px] bg-white rounded-[40px] shadow-sm border border-gray-100 p-10 space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-gray-900 uppercase">
            Forgot Password
          </h2>

          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
            Reset your account password
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* NEW PASSWORD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">
              New Password
            </label>

            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">
              Confirm Password
            </label>

            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* SUCCESS */}
          {message && (
            <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest text-center">
                {message}
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">
                {error}
              </p>
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 bg-[#ff8a00] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-100 hover:bg-[#e67e00] transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>

          {/* BACK */}
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="w-full text-[11px] text-gray-400 font-bold uppercase tracking-widest hover:text-orange-500"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
