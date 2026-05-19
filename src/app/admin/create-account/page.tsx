"use client";

import { useEffect, useState } from "react";

export default function CreateAccountPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const [roles, setRoles] = useState([]);

    useEffect(() => {
    fetchRoles();
    }, []);

    const fetchRoles = async () => {
    try {
        const response = await fetch("/api/roles");

        const data = await response.json();

        if (data.success) {
        setRoles(data.roles);
        }
    } catch (error) {
        console.error("FETCH ROLES ERROR:", error);
    }
    };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateAccount = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert("Account created successfully!");

        setFormData({
          name: "",
          email: "",
          password: "",
          role: "",
        });
        
      } else {
        alert(data.message || "Failed to create account");
      }
    } catch (error) {
      console.error("CREATE ACCOUNT ERROR:", error);
      alert("Something went wrong");
    }
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">
            Create Account
          </h1>

          <p className="text-sm text-gray-400 mt-2">
            Create new user account for the system.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleCreateAccount}
          className="space-y-6"
        >
          {/* FULL NAME */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Full Name
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-400"
              required
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-400"
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-400"
              required
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Role
            </label>

            <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-400"
            required
            >
            <option value="">Select Role</option>

            {roles.map((role: any) => (
                <option
                key={role.role_id}
                value={role.role_id}
                >
                {role.role_name}
                </option>
            ))}
            </select>
          </div>

          {/* BUTTON */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 transition-all text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}