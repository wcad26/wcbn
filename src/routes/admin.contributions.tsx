import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { documentUrl, money, useIdentity } from "@/lib/wcbn";
import { getCategoryArchetype, type Category } from "@/lib/fees";

export const Route = createFileRoute("/admin/contributions")({ component: ContributionsAdmin });

interface MemberProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface MemberRecord {
  id: string;
  category: string | null;
  category_id: string | null;
  profiles: MemberProfile | null;
}

interface PaymentRecord {
  id: string;
  invoice_id: string | null;
  amount: number | string;
  currency_code: string;
  method: string | null;
  provider: string | null;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  submitted_by: string | null;
  profiles?: MemberProfile | null;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  wcbn_member_id: string | null;
  category_id: string | null;
  application_id: string | null;
  amount: number | string;
  paid_amount: number | string;
  currency_code: string;
  billing_cycle: string | null;
  payment_method: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  created_at: string;
}

function ContributionsAdmin() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "partial">("all");

  // Issue Invoice Modal State
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"annual" | "semi_annual" | "quarterly">("annual");
  const [invoiceCurrency, setInvoiceCurrency] = useState("XAF");
  const [invoiceAmount, setInvoiceAmount] = useState<number>(25000);
  const [dueDateDays, setDueDateDays] = useState(30);

  // Receipt Inspection Modal State
  const [inspectingPayment, setInspectingPayment] = useState<PaymentRecord | null>(null);
  const [signedSlipUrl, setSignedSlipUrl] = useState<string | null>(null);
  const [loadingSlipUrl, setLoadingSlipUrl] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contributions-modern"],
    queryFn: async () => {
      const [invoicesRes, paymentsRes, categoriesRes, membersRes] = await Promise.all([
        supabase.from("wcbn_invoices").select("*").order("created_at", { ascending: false }),
        supabase
          .from("wcbn_payments")
          .select("*, profiles:submitted_by(first_name, last_name, email, phone)")
          .order("created_at", { ascending: false }),
        supabase.from("wcbn_membership_categories").select("*").order("display_order"),
        supabase
          .from("wcbn_members")
          .select("id, category, category_id, profiles(first_name, last_name, email, phone)")
          .order("created_at", { ascending: false }),
      ]);

      const invoices = (invoicesRes.data ?? []) as InvoiceRecord[];
      const payments = (paymentsRes.data ?? []) as PaymentRecord[];
      const categories = (categoriesRes.data ?? []) as Category[];
      const members = (membersRes.data ?? []) as unknown as MemberRecord[];

      return { invoices, payments, categories, members };
    },
  });

  const categories = data?.categories ?? [];
  const members = data?.members ?? [];
  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];

  // Mappings for fast lookup
  const memberMap = new Map<string, MemberRecord>();
  members.forEach((m) => memberMap.set(m.id, m));

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const invoiceMap = new Map<string, InvoiceRecord>();
  invoices.forEach((i) => invoiceMap.set(i.id, i));

  // Pending payments awaiting verification
  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "declared");

  // Summary Metrics
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const pendingAmount = pendingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Confirm Payment & Activate Member Mutation
  const confirmPayment = useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      if (!payment.invoice_id) throw new Error("Payment is not attached to an invoice.");

      // Attempt standard RPC first
      const { error: rpcErr } = await supabase.rpc("wcbn_confirm_payment", {
        _invoice_id: payment.invoice_id,
        _method: payment.method || "bank_transfer",
        _provider: payment.provider || "bank",
        _reference: payment.reference || "confirmed-by-admin",
        _amount: Number(payment.amount),
      });

      if (rpcErr) {
        // Direct resilient fallback
        const { error: updErr } = await supabase
          .from("wcbn_payments")
          .update({
            status: "confirmed",
            verified_at: new Date().toISOString(),
            verified_by: identity?.userId ?? null,
          })
          .eq("id", payment.id);
        if (updErr) throw updErr;

        const inv = invoiceMap.get(payment.invoice_id);
        if (inv) {
          const newPaid = Number(inv.paid_amount || 0) + Number(payment.amount);
          await supabase
            .from("wcbn_invoices")
            .update({
              paid_amount: newPaid,
              status: newPaid >= Number(inv.amount) ? "paid" : "partial",
              payment_method: payment.method || "bank_transfer",
            })
            .eq("id", inv.id);

          if (inv.application_id) {
            await supabase
              .from("wcbn_applications")
              .update({
                status: "approved",
                current_stage: "inducted",
                decided_at: new Date().toISOString(),
                decision_reason: "Activated on verification of membership fee payment",
              })
              .eq("id", inv.application_id);
          }

          if (inv.wcbn_member_id) {
            await supabase
              .from("wcbn_members")
              .update({
                status: "active",
                inducted_at: new Date().toISOString(),
              })
              .eq("id", inv.wcbn_member_id);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Payment verified! Invoice settled and member inducted.");
      setInspectingPayment(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(`Verification error: ${e.message}`),
  });

  // Reject / Decline Slip Mutation
  const rejectPayment = useMutation({
    mutationFn: async (payment: PaymentRecord) => {
      const { error } = await supabase
        .from("wcbn_payments")
        .update({
          status: "failed",
          verified_at: new Date().toISOString(),
          verified_by: identity?.userId ?? null,
        })
        .eq("id", payment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment slip marked as declined/invalid.");
      setInspectingPayment(null);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handle viewing transfer slip
  const handleInspectSlip = async (p: PaymentRecord) => {
    setInspectingPayment(p);
    setSignedSlipUrl(null);
    if (!p.proof_url) return;

    setLoadingSlipUrl(true);
    try {
      if (p.proof_url.startsWith("http://") || p.proof_url.startsWith("https://")) {
        setSignedSlipUrl(p.proof_url);
      } else {
        const signed = await documentUrl(p.proof_url);
        setSignedSlipUrl(signed);
      }
    } catch {
      toast.error("Could not generate secure view link for receipt.");
    } finally {
      setLoadingSlipUrl(false);
    }
  };

  // Issue manual invoice mutation
  const issueInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId) throw new Error("Please select a member.");
      if (invoiceAmount <= 0) throw new Error("Please specify a valid invoice amount.");

      const now = new Date();
      const periodStart = now.toISOString().slice(0, 10);
      const periodEnd = new Date(now);
      if (billingCycle === "annual") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (billingCycle === "semi_annual") {
        periodEnd.setMonth(periodEnd.getMonth() + 6);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
      }

      const due = new Date(now);
      due.setDate(due.getDate() + (dueDateDays || 30));

      const invNumber = `WCBN-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from("wcbn_invoices").insert({
        wcbn_member_id: selectedMemberId,
        category_id: selectedCategoryId || null,
        billing_cycle: billingCycle,
        amount: invoiceAmount,
        paid_amount: 0,
        currency_code: invoiceCurrency,
        invoice_number: invNumber,
        period_start: periodStart,
        period_end: periodEnd.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        status: "issued",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membership invoice created successfully.");
      setIssueOpen(false);
      setSelectedMemberId("");
      setSelectedCategoryId("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Category change handler for auto-calculating fees
  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categoryMap.get(catId);
    if (cat && cat.fees) {
      const fees = cat.fees as Record<string, number>;
      const preferred = fees[invoiceCurrency] ?? fees["XAF"] ?? Object.values(fees)[0] ?? 25000;
      let calculated = Number(preferred);
      if (billingCycle === "semi_annual") calculated = Math.round(calculated / 2);
      if (billingCycle === "quarterly") calculated = Math.round(calculated / 4);
      setInvoiceAmount(calculated);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const numMatch = i.invoice_number?.toLowerCase().includes(q);
      const member = i.wcbn_member_id ? memberMap.get(i.wcbn_member_id) : null;
      const nameMatch = `${member?.profiles?.first_name ?? ""} ${member?.profiles?.last_name ?? ""}`.toLowerCase().includes(q);
      const emailMatch = member?.profiles?.email?.toLowerCase().includes(q);
      if (!numMatch && !nameMatch && !emailMatch) return false;
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export.");
      return;
    }
    const headers = ["Invoice Number", "Member Name", "Email", "Category", "Billing Cycle", "Amount", "Paid Amount", "Currency", "Status", "Due Date", "Created At"];
    const rows = filteredInvoices.map((i) => {
      const member = i.wcbn_member_id ? memberMap.get(i.wcbn_member_id) : null;
      const cat = i.category_id ? categoryMap.get(i.category_id) : null;
      const name = [member?.profiles?.first_name, member?.profiles?.last_name].filter(Boolean).join(" ") || "Applicant";
      return [
        `"${i.invoice_number}"`,
        `"${name}"`,
        `"${member?.profiles?.email ?? ""}"`,
        `"${cat?.name ?? member?.category ?? "General"}"`,
        `"${i.billing_cycle ?? "annual"}"`,
        i.amount,
        i.paid_amount,
        i.currency_code,
        i.status,
        i.due_date ?? "",
        i.created_at ? new Date(i.created_at).toLocaleDateString() : "",
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wcbn_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully.");
  };

  return (
    <AdminPage
      title="Finance & Invoices"
      description="Bank transfer slip verification queue, dynamic category fee management, and membership collections ledger."
    >
      <div className="space-y-6">
        {/* KPI Summary Banner */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Invoiced</span>
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{money(totalInvoiced, "XAF")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{invoices.length} invoices generated</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Verified Revenue</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{money(totalCollected, "XAF")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{collectionRate}% collection fulfillment</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding Balance</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {money(Math.max(0, totalInvoiced - totalCollected), "XAF")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Arrears & unpaid instalments</p>
          </div>

          <div className={`rounded-2xl border p-5 shadow-card ${pendingPayments.length > 0 ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Pending Slips</span>
              <Landmark className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingPayments.length}</p>
              {pendingAmount > 0 && (
                <span className="text-xs text-muted-foreground">({money(pendingAmount, "XAF")})</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting bank verification</p>
          </div>
        </div>

        {/* Priority Section: Bank Transfer Slip Verification Queue */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Bank Transfer Verification Queue</h2>
                {pendingPayments.length > 0 && (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    {pendingPayments.length} Action Needed
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Review uploaded proof of transfer receipts. Confirming immediately inducts the applicant and marks their invoice as paid.
              </p>
            </div>

            <Button onClick={() => setIssueOpen(true)} className="gap-2">
              <FilePlus2 className="size-4" /> Issue Manual Invoice
            </Button>
          </div>

          <div className="mt-6">
            {pendingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
                <CheckCircle2 className="size-10 text-emerald-500/80 mb-2" />
                <p className="font-semibold text-foreground">All transfer slips are up to date!</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                  When new members upload bank deposit or wire slips during onboarding, they will appear here for 1-click verification.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingPayments.map((payment) => {
                  const invoice = payment.invoice_id ? invoiceMap.get(payment.invoice_id) : null;
                  const member = invoice?.wcbn_member_id ? memberMap.get(invoice.wcbn_member_id) : null;
                  const cat = invoice?.category_id ? categoryMap.get(invoice.category_id) : null;
                  const archetype = cat ? getCategoryArchetype(cat) : "entrepreneur";
                  const applicantName =
                    [payment.profiles?.first_name, payment.profiles?.last_name].filter(Boolean).join(" ") ||
                    [member?.profiles?.first_name, member?.profiles?.last_name].filter(Boolean).join(" ") ||
                    payment.profiles?.email ||
                    "Member";

                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col justify-between rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-foreground text-sm leading-tight">{applicantName}</p>
                            <p className="text-xs text-muted-foreground">{payment.profiles?.email || member?.profiles?.email}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 font-medium ${archetype === "investor_mentor" ? "border-purple-500/40 text-purple-600 bg-purple-500/10" : "border-primary/40 text-primary bg-primary/10"}`}>
                            {archetype === "investor_mentor" ? "Investor / Mentor" : "Entrepreneur"}
                          </Badge>
                        </div>

                        <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-bold text-foreground">{money(Number(payment.amount), payment.currency_code)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice:</span>
                            <span className="font-mono text-foreground">{invoice?.invoice_number || "—"}</span>
                          </div>
                          {payment.reference && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reference:</span>
                              <span className="font-mono text-foreground">{payment.reference}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="text-foreground">{cat?.name || member?.category || "Membership"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Declared on:</span>
                            <span className="text-foreground">{new Date(payment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {payment.proof_url ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full gap-2 text-xs"
                            onClick={() => handleInspectSlip(payment)}
                          >
                            <Eye className="size-3.5 text-primary" /> Inspect Attached Slip / Receipt
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-500/10 px-2.5 py-1.5 rounded-lg">
                            <AlertCircle className="size-3.5 shrink-0" /> No document file attached
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={confirmPayment.isPending}
                          onClick={() => confirmPayment.mutate(payment)}
                        >
                          {confirmPayment.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                          Confirm & Activate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          disabled={rejectPayment.isPending}
                          onClick={() => {
                            if (window.confirm("Are you sure you want to decline this transfer record?")) {
                              rejectPayment.mutate(payment);
                            }
                          }}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Master Invoices Table Section */}
        <section className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Master Invoices Ledger</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                All generated membership dues invoices, billing schedules, and settlement statuses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
                <FileSpreadsheet className="size-3.5 text-emerald-600" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, member, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs rounded-full px-3"
              >
                All ({invoices.length})
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
                className="h-8 text-xs rounded-full px-3 text-emerald-600"
              >
                Paid ({invoices.filter((i) => i.status === "paid").length})
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="h-8 text-xs rounded-full px-3 text-amber-600"
              >
                Pending ({invoices.filter((i) => i.status === "issued" || i.status === "pending").length})
              </Button>
              <Button
                variant={statusFilter === "partial" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("partial")}
                className="h-8 text-xs rounded-full px-3 text-blue-600"
              >
                Partial ({invoices.filter((i) => i.status === "partial").length})
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4 font-semibold">Invoice #</th>
                  <th className="p-4 font-semibold">Member / Applicant</th>
                  <th className="p-4 font-semibold">Category & Track</th>
                  <th className="p-4 font-semibold">Billing Period</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                  <th className="p-4 font-semibold text-right">Paid</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No invoices found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const member = inv.wcbn_member_id ? memberMap.get(inv.wcbn_member_id) : null;
                    const cat = inv.category_id ? categoryMap.get(inv.category_id) : null;
                    const archetype = cat ? getCategoryArchetype(cat) : "entrepreneur";
                    const memberName =
                      [member?.profiles?.first_name, member?.profiles?.last_name].filter(Boolean).join(" ") ||
                      member?.profiles?.email ||
                      "Applicant";

                    const isPaid = inv.status === "paid";
                    const isPartial = inv.status === "partial";

                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-mono font-medium text-xs text-foreground">
                          {inv.invoice_number}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground text-xs leading-tight">{memberName}</div>
                          <div className="text-[11px] text-muted-foreground">{member?.profiles?.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-medium text-foreground">{cat?.name || member?.category || "—"}</div>
                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${archetype === "investor_mentor" ? "text-purple-600 bg-purple-500/10" : "text-primary bg-primary/10"}`}>
                            {archetype === "investor_mentor" ? "Investor/Mentor" : "Entrepreneur"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {inv.period_start && inv.period_end ? (
                            <span>{inv.period_start} → {inv.period_end}</span>
                          ) : (
                            <span>Due: {inv.due_date || "Upon receipt"}</span>
                          )}
                          <div className="text-[10px] uppercase capitalize text-muted-foreground">
                            {inv.billing_cycle || "annual"} cycle
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-xs text-right whitespace-nowrap">
                          {money(Number(inv.amount), inv.currency_code)}
                        </td>
                        <td className="p-4 text-xs text-right whitespace-nowrap">
                          <span className={Number(inv.paid_amount) > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                            {money(Number(inv.paid_amount), inv.currency_code)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize font-medium ${
                              isPaid
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : isPartial
                                ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                                : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          {!isPaid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              onClick={async () => {
                                if (window.confirm(`Mark invoice ${inv.invoice_number} as manually paid?`)) {
                                  const { error } = await supabase
                                    .from("wcbn_invoices")
                                    .update({
                                      paid_amount: inv.amount,
                                      status: "paid",
                                      payment_method: "cash_direct",
                                    })
                                    .eq("id", inv.id);
                                  if (error) {
                                    toast.error(error.message);
                                  } else {
                                    toast.success("Invoice marked as paid.");
                                    queryClient.invalidateQueries({ queryKey: ["admin"] });
                                  }
                                }
                              }}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" /> Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Slip Receipt Inspection Dialog */}
      <Dialog open={!!inspectingPayment} onOpenChange={(open) => !open && setInspectingPayment(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="size-5 text-primary" /> Bank Transfer Slip Inspection
            </DialogTitle>
            <DialogDescription>
              Verify the payment amount and reference number before approving the member.
            </DialogDescription>
          </DialogHeader>

          {inspectingPayment && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="text-sm font-bold text-foreground">
                    {money(Number(inspectingPayment.amount), inspectingPayment.currency_code)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reference / Transaction ID:</span>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {inspectingPayment.reference || "None provided"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Applicant / Submitter:</span>
                  <p className="font-medium text-foreground">
                    {[inspectingPayment.profiles?.first_name, inspectingPayment.profiles?.last_name].filter(Boolean).join(" ") || inspectingPayment.profiles?.email}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submission Date:</span>
                  <p className="font-medium text-foreground">
                    {new Date(inspectingPayment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Receipt File Preview */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <span className="text-xs font-semibold text-foreground">Attached Document</span>
                  {signedSlipUrl && (
                    <a
                      href={signedSlipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Open in new tab <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>

                {loadingSlipUrl ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mb-2" />
                    <p className="text-xs">Loading secure transfer document...</p>
                  </div>
                ) : signedSlipUrl ? (
                  signedSlipUrl.toLowerCase().includes(".pdf") ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg">
                      <FileText className="size-12 text-primary/80 mb-2" />
                      <p className="text-xs font-medium text-foreground">PDF Receipt Attached</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3 gap-1.5 text-xs"
                        onClick={() => window.open(signedSlipUrl, "_blank")}
                      >
                        <Download className="size-3.5" /> Open / Download PDF Receipt
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-center bg-black/5 dark:bg-black/30 rounded-lg overflow-hidden max-h-[380px]">
                      <img
                        src={signedSlipUrl}
                        alt="Bank transfer slip"
                        className="max-h-[380px] w-auto object-contain rounded"
                      />
                    </div>
                  )
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No preview available for this record.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
              disabled={rejectPayment.isPending}
              onClick={() => {
                if (inspectingPayment && window.confirm("Decline this transfer record?")) {
                  rejectPayment.mutate(inspectingPayment);
                }
              }}
            >
              <XCircle className="size-4 mr-1.5" /> Decline Transfer
            </Button>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              disabled={confirmPayment.isPending || !inspectingPayment}
              onClick={() => inspectingPayment && confirmPayment.mutate(inspectingPayment)}
            >
              {confirmPayment.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm Payment & Activate Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Manual Category Invoice Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="size-5 text-primary" /> Issue Membership Dues Invoice
            </DialogTitle>
            <DialogDescription>
              Generate a custom or recurring membership invoice for a network member based on their membership category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Network Member</Label>
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  const mem = memberMap.get(e.target.value);
                  if (mem?.category_id) {
                    handleCategorySelect(mem.category_id);
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => {
                  const p = m.profiles;
                  const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || m.id;
                  return (
                    <option key={m.id} value={m.id}>
                      {name} ({m.category || "General"})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Membership Category</Label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">-- Choose Membership Category --</option>
                {categories.map((c) => {
                  const archetype = getCategoryArchetype(c);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} [{archetype === "investor_mentor" ? "Investor / Mentor" : "Entrepreneur"}]
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Billing Frequency</Label>
                <select
                  value={billingCycle}
                  onChange={(e) => {
                    const cycle = e.target.value as "annual" | "semi_annual" | "quarterly";
                    setBillingCycle(cycle);
                    if (selectedCategoryId) {
                      const cat = categoryMap.get(selectedCategoryId);
                      if (cat && cat.fees) {
                        const fees = cat.fees as Record<string, number>;
                        const pref = fees[invoiceCurrency] ?? fees["XAF"] ?? Object.values(fees)[0] ?? 25000;
                        let calc = Number(pref);
                        if (cycle === "semi_annual") calc = Math.round(calc / 2);
                        if (cycle === "quarterly") calc = Math.round(calc / 4);
                        setInvoiceAmount(calc);
                      }
                    }
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="annual">Annual (Full Year)</option>
                  <option value="semi_annual">Semi-Annual (2 Installments)</option>
                  <option value="quarterly">Quarterly (4 Installments)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <select
                  value={invoiceCurrency}
                  onChange={(e) => {
                    const cur = e.target.value;
                    setInvoiceCurrency(cur);
                    if (selectedCategoryId) {
                      const cat = categoryMap.get(selectedCategoryId);
                      if (cat && cat.fees) {
                        const fees = cat.fees as Record<string, number>;
                        if (fees[cur]) setInvoiceAmount(Number(fees[cur]));
                      }
                    }
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="XAF">XAF (FCFA)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Amount</Label>
                <Input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                  className="h-10 text-xs"
                  placeholder="25000"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Due Within</Label>
                <select
                  value={dueDateDays}
                  onChange={(e) => setDueDateDays(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              disabled={issueInvoiceMutation.isPending || !selectedMemberId || invoiceAmount <= 0}
              onClick={() => issueInvoiceMutation.mutate()}
              className="text-xs gap-1.5"
            >
              {issueInvoiceMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FilePlus2 className="size-3.5" />}
              Generate & Issue Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
