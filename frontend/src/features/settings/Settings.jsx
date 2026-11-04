import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Moon, Sun, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../auth/authApi.js";
import { useAuth } from "../auth/useAuth.js";
import { ROLE_LABELS } from "../../lib/roles.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useTheme } from "../../hooks/useTheme.jsx";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(form.currentPassword, form.newPassword),
    onSuccess: () => {
      toast.success("Password updated");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update password"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    changePasswordMutation.mutate();
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Profile & Settings" description="Manage your account and appearance preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="text-slate-200">{user?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="text-slate-200">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="text-slate-200">{ROLE_LABELS[user?.role]}</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Appearance</h3>
          <div className="inline-flex rounded-lg border border-surface-border bg-surface p-1">
            <button
              type="button"
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                theme === "dark" ? "bg-surface-overlay text-slate-100 shadow-elevated" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Moon size={14} /> Dark
            </button>
            <button
              type="button"
              onClick={() => theme !== "light" && toggleTheme()}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                theme === "light" ? "bg-surface-overlay text-slate-100 shadow-elevated" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sun size={14} /> Light
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Your preference is saved to this browser.</p>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-raised p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Change Password</h3>
          <form onSubmit={handleSubmit} className="grid max-w-md gap-4">
            <Input
              label="Current Password"
              type="password"
              required
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            />
            <Input
              label="New Password"
              type="password"
              required
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            />
            <Button type="submit" icon={KeyRound} loading={changePasswordMutation.isPending} className="w-fit">
              Update Password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
