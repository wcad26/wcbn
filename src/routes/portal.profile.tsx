import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity, useInvalidateIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/profile")({ component: ProfilePage });

export function ProfilePage() {
  const { data: identity, isLoading } = useIdentity();
  const refresh = useInvalidateIdentity();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    avatar_url: "",
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (identity?.profile) {
      setForm({
        first_name: identity.profile.first_name ?? "",
        last_name: identity.profile.last_name ?? "",
        phone: identity.profile.phone ?? "",
        address: identity.profile.address ?? "",
        avatar_url: identity.profile.avatar_url ?? "",
      });
    }
  }, [identity?.profile]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
        })
        .eq("id", identity.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated successfully.");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage
      title="Personal Profile & Account"
      description="Manage your World Changers Association account credentials, contact information, and membership standing."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPasswordDialogOpen(true)}
          className="rounded-xl gap-2 shadow-sm"
        >
          <KeyRound className="size-4 text-primary" />
          <span>Change Password</span>
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-12 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Loading member profile...</span>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Personal Information Editor */}
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-6">
              {/* Profile Card Header with Avatar */}
              <div className="flex flex-wrap items-center gap-5 border-b border-border/60 pb-6">
                {identity?.profile?.avatar_url ? (
                  <img
                    src={identity.profile.avatar_url}
                    alt={identity.fullName ?? "Avatar"}
                    className="size-16 rounded-2xl object-cover border border-border shadow-md"
                  />
                ) : (
                  <div className="grid size-16 place-items-center rounded-2xl gradient-brand text-2xl font-bold text-primary-foreground shadow-md">
                    {(identity?.fullName ?? "W").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-foreground">{identity?.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{identity?.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                      {identity?.wcbnMember?.category || "Enterprise"} Track
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                      Active Member
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      First Name
                    </Label>
                    <Input
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Last Name
                    </Label>
                    <Input
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Primary Phone / WhatsApp
                    </Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="rounded-xl h-11"
                      placeholder="+237 6..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Registered Sign-In Email
                    </Label>
                    <Input
                      value={identity?.email ?? ""}
                      disabled
                      className="rounded-xl h-11 bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Address / Operational City
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="rounded-xl h-11"
                    placeholder="Douala, Cameroon"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Profile Photo Link (URL)
                  </Label>
                  <Input
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    className="rounded-xl h-11"
                    placeholder="https://... direct image link"
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct image link for your avatar photo in the member portal.
                  </p>
                </div>

                <div className="pt-3">
                  <Button
                    className="rounded-xl h-11 px-6 shadow-sm"
                    disabled={saveProfileMutation.isPending}
                    onClick={() => saveProfileMutation.mutate()}
                  >
                    {saveProfileMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Save Profile Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: WCA & WCBN Credentials Dossier */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <ShieldCheck className="size-4 text-primary" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  WCA Platform Record
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Member ID</span>
                  <strong className="font-mono text-foreground text-sm">
                    {identity?.member?.member_id ?? "WCA-REGISTERED"}
                  </strong>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-border/60">
                  <span className="text-muted-foreground">Regional Hub</span>
                  <span className="font-medium text-foreground">{identity?.regionName ?? "Central Africa Hub"}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-border/60">
                  <span className="text-muted-foreground">Care Group (DCG)</span>
                  <span className="font-medium text-foreground">{identity?.dcgName ?? "Destiny Group"}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-border/60">
                  <span className="text-muted-foreground">Induction Date</span>
                  <span className="font-medium text-foreground">
                    {identity?.wcbnMember?.inducted_at
                      ? new Date(identity.wcbnMember.inducted_at).toLocaleDateString()
                      : "Active Member"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Active WCA Network Membership</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>WCBN Good Standing Status</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="size-3.5" />
                <span>Security & Access</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your sign-in credentials give you authenticated access to the Member Portal, event registration, and business profile management.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs"
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Security Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <span>Change Account Password</span>
            </DialogTitle>
            <DialogDescription>
              Enter a new secure password for your World Changers account.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Password
              </Label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setPasswordDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => updatePasswordMutation.mutate()}
              disabled={updatePasswordMutation.isPending}
              className="rounded-xl px-5"
            >
              {updatePasswordMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPage>
  );
}
