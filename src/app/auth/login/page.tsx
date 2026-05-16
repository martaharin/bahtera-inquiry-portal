"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("123456");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // DEBUG (hapus kalau sudah production)
    console.log("EMAIL SENT:", email);
    console.log("PASSWORD SENT:", password);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      console.log("API RESPONSE:", data);

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/admin/dashboard");
      } else {
        setErrorMessage(data.error || "Login gagal, cek email/password kamu.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Koneksi ke server bermasalah.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-6">
      <div className="w-full max-w-[450px] bg-white rounded-[40px] shadow-sm border border-gray-100 p-10 space-y-8">

        <form onSubmit={handleLogin} className="space-y-5">

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase ml-1 tracking-widest">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bahtera.com"
              className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Password
              </label>

              <a
                href="#"
                className="text-[10px] font-bold text-orange-500 hover:underline uppercase tracking-widest"
              >
                Forgot?
              </a>
            </div>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">
              {errorMessage}
            </p>
          )}

          {/* BUTTON */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className={`w-full py-4 bg-[#ff8a00] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-100 hover:bg-[#e67e00] transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </div>
        </form>

        {/* FOOTER */}
        <div className="text-center pt-4">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
            © 2026 PT. Bahtera Adi Jaya
          </p>
        </div>
      </div>
    </div>
  );
}