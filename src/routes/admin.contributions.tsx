import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Layers,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  User,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { documentUrl, money, useIdentity } from "@/lib/wcbn";
import { getCategoryArchetype, type Category } from "@/lib/fees";
import { PeriodFilter, PeriodFilterState, isDateInPeriod } from "@/components/wcbn/period-filter";

export const Route = createFileRoute("/admin/contributions")({ component: ContributionsAdmin });

interface MemberProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url?: string | null;
  address?: string | null;
}

interface MemberRecord {
  id: string;
  category: string | null;
  category_id: string | null;
  member_id?: string | null;
  profiles: MemberProfile | null;
  members?: {
    member_id: string;
    status: string | null;
  } | null;
}

interface ApplicationRecord {
  id: string;
  wcbn_member_id: string | null;
  applicant_type: string;
  applicant_data: Record<string, any>;
  status: string;
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
  installment_number?: number | null;
  installments_total?: number | null;
  created_at: string;
}

interface ApplicantInvoiceGroup {
  key: string;
  applicantName: string;
  applicantEmail: string;
  memberId: string | null;
  applicationId: string | null;
  wcaId: string | null;
  categoryName: string;
  archetype: "entrepreneur" | "investor_mentor";
  billingCycle: string;
  currency: string;
  totalAmount: number;
  totalPaid: number;
  overallStatus: "paid" | "partial" | "pending";
  invoices: InvoiceRecord[];
}

function formatPaymentMethod(method: string | null) {
  if (!method) return "Pending selection";
  switch (method) {
    case "mobile_money":
      return "Mobile Money";
    case "card":
      return "Card";
    case "bank_transfer":
      return "Bank Transfer";
    case "cash_direct":
    case "direct_settlement":
      return "Cash / Direct";
    default:
      return method.replace(/_/g, " ");
  }
}

function ContributionsAdmin() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();

  // Master Global Page Filters (placed at top before KPIs)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "partial">("all");
  const [period, setPeriod] = useState<PeriodFilterState>({ preset: "all" });

  // Expandable dropdown states for grouped invoices
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
      const [invoicesRes, paymentsRes, categoriesRes, membersRes, appsRes] = await Promise.all([
        supabase.from("wcbn_invoices").select("*").order("created_at", { ascending: false }),
        supabase
          .from("wcbn_payments")
          .select("*, profiles:submitted_by(first_name, last_name, email, phone)")
          .order("created_at", { ascending: false }),
        supabase.from("wcbn_membership_categories").select("*").order("display_order"),
        supabase
          .from("wcbn_members")
          .select(`
            id, category, category_id, member_id,
            profiles (first_name, last_name, email, phone, avatar_url, address),
            members (member_id, status)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("wcbn_applications")
          .select("id, wcbn_member_id, applicant_type, applicant_data, status")
          .order("created_at", { ascending: false }),
      ]);

      const invoices = (invoicesRes.data ?? []) as InvoiceRecord[];
      const payments = (paymentsRes.data ?? []) as PaymentRecord[];
      const categories = (categoriesRes.data ?? []) as Category[];
      const members = (membersRes.data ?? []) as unknown as MemberRecord[];
      const applications = (appsRes.data ?? []) as ApplicationRecord[];

      return { invoices, payments, categories, members, applications };
    },
  });

  const categories = data?.categories ?? [];
  const members = data?.members ?? [];
  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];
  const applications = data?.applications ?? [];

  // Mappings for fast lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, MemberRecord>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const appMap = useMemo(() => {
    const map = new Map<string, ApplicationRecord>();
    applications.forEach((a) => map.set(a.id, a));
    return map;
  }, [applications]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const invoiceMap = useMemo(() => {
    const map = new Map<string, InvoiceRecord>();
    invoices.forEach((i) => map.set(i.id, i));
    return map;
  }, [invoices]);

  // Master Global Page Filtering: Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      // Period filter
      if (!isDateInPeriod(i.created_at, period)) return false;

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "paid" && i.status !== "paid") return false;
        if (
          statusFilter === "pending" &&
          i.status !== "issued" &&
          i.status !== "pending" &&
          i.status !== "scheduled"
        ) {
          return false;
        }
        if (statusFilter === "partial" && i.status !== "partial") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = i.invoice_number?.toLowerCase().includes(q);
        const member = i.wcbn_member_id ? memberMap.get(i.wcbn_member_id) : null;
        const app = i.application_id ? appMap.get(i.application_id) : null;
        const appData = (app?.applicant_data as Record<string, any>) || {};
        const memberName = [member?.profiles?.first_name, member?.profiles?.last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const applicantName = (appData.full_name || appData.first_name || "").toLowerCase();
        const email = (member?.profiles?.email || appData.email || "").toLowerCase();
        const methodMatch = (i.payment_method || "").toLowerCase().includes(q);

        if (!numMatch && !memberName.includes(q) && !applicantName.includes(q) && !email.includes(q) && !methodMatch) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, period, statusFilter, searchQuery, memberMap, appMap]);

  // Master Global Page Filtering: Bank Transfer Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Period filter
      if (!isDateInPeriod(p.created_at, period)) return false;

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && p.status !== "pending" && p.status !== "declared") return false;
        if (statusFilter === "paid" && p.status !== "confirmed" && p.status !== "verified") return false;
        if (statusFilter === "partial") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = p.reference?.toLowerCase().includes(q);
        const inv = p.invoice_id ? invoiceMap.get(p.invoice_id) : null;
        const invMatch = inv?.invoice_number?.toLowerCase().includes(q);
        const nameMatch = `${p.profiles?.first_name ?? ""} ${p.profiles?.last_name ?? ""}`.toLowerCase().includes(q);
        const emailMatch = p.profiles?.email?.toLowerCase().includes(q);

        if (!refMatch && !invMatch && !nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [payments, period, statusFilter, searchQuery, invoiceMap]);

  // Pending payments awaiting verification in Tab 1
  const pendingPaymentsInQueue = useMemo(() => {
    return filteredPayments.filter((p) => p.status === "pending" || p.status === "declared");
  }, [filteredPayments]);

  // Grouped Invoices per Applicant for Tab 2 (Master Invoices Ledger)
  const groupedInvoices = useMemo(() => {
    const groupsMap = new Map<string, ApplicantInvoiceGroup>();

    for (const inv of filteredInvoices) {
      const member = inv.wcbn_member_id ? memberMap.get(inv.wcbn_member_id) : null;
      const app = inv.application_id ? appMap.get(inv.application_id) : null;
      const cat = inv.category_id ? categoryMap.get(inv.category_id) : null;

      // Stable applicant group key
      const groupKey = inv.wcbn_member_id || inv.application_id || inv.invoice_number;

      let group = groupsMap.get(groupKey);
      if (!group) {
        const appData = (app?.applicant_data as Record<string, any>) || {};
        const appPersonal = (appData.personal_info as Record<string, any>) || {};

        const firstName =
          member?.profiles?.first_name ||
          appData.first_name ||
          appPersonal.first_name ||
          "";
        const lastName =
          member?.profiles?.last_name ||
          appData.last_name ||
          appPersonal.last_name ||
          "";
        const email =
          member?.profiles?.email ||
          appData.email ||
          appPersonal.email ||
          "";

        const applicantName =
          [firstName, lastName].filter(Boolean).join(" ") ||
          appData.full_name ||
          appData.organization ||
          appData.business_name ||
          email ||
          "Network Applicant";

        const archetype = cat
          ? getCategoryArchetype(cat)
          : app?.applicant_type === "investor" || app?.applicant_type === "mentor"
          ? "investor_mentor"
          : "entrepreneur";

        const categoryName =
          cat?.name ||
          member?.category ||
          (archetype === "investor_mentor" ? "Investor / Mentor Track" : "General Membership");

        group = {
          key: groupKey,
          applicantName,
          applicantEmail: email,
          memberId: inv.wcbn_member_id,
          applicationId: inv.application_id,
          wcaId: member?.members?.member_id || member?.member_id || null,
          categoryName,
          archetype,
          billingCycle: inv.billing_cycle || "annual",
          currency: inv.currency_code || "XAF",
          totalAmount: 0,
          totalPaid: 0,
          overallStatus: "pending",
          invoices: [],
        };
        groupsMap.set(groupKey, group);
      }

      group.totalAmount += Number(inv.amount || 0);
      group.totalPaid += Number(inv.paid_amount || 0);
      group.invoices.push(inv);
    }

    // Sort invoices chronologically / by instalment inside each applicant group
    return Array.from(groupsMap.values()).map((g) => {
      g.invoices.sort((a, b) => {
        if (a.installment_number && b.installment_number) {
          return a.installment_number - b.installment_number;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      if (g.totalPaid >= g.totalAmount && g.totalAmount > 0) {
        g.overallStatus = "paid";
      } else if (g.totalPaid > 0) {
        g.overallStatus = "partial";
      } else {
        g.overallStatus = "pending";
      }

      return g;
    });
  }, [filteredInvoices, memberMap, appMap, categoryMap]);

  // Master Summary KPIs (Computed from the active master filter)
  const totalInvoiced = useMemo(
    () => filteredInvoices.reduce((s, i) => s + Number(i.amount || 0), 0),
    [filteredInvoices]
  );
  const totalCollected = useMemo(
    () => filteredInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0),
    [filteredInvoices]
  );
  const pendingSlipAmount = useMemo(
    () => pendingPaymentsInQueue.reduce((s, p) => s + Number(p.amount || 0), 0),
    [pendingPaymentsInQueue]
  );
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

  // Mark Individual Invoice Paid Mutation
  const markInvoicePaid = useMutation({
    mutationFn: async (inv: InvoiceRecord) => {
      const { error } = await supabase
        .from("wcbn_invoices")
        .update({
          paid_amount: Number(inv.amount),
          status: "paid",
          payment_method: inv.payment_method || "direct_settlement",
        })
        .eq("id", inv.id);
      if (error) throw error;

      if (inv.application_id) {
        await supabase
          .from("wcbn_applications")
          .update({
            status: "approved",
            current_stage: "inducted",
            decided_at: new Date().toISOString(),
            decision_reason: "Membership dues settled by administration",
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
    },
    onSuccess: () => {
      toast.success("Invoice marked as paid and recorded.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(`Error marking paid: ${e.message}`),
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

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices match current filters to export.");
      return;
    }
    const headers = [
      "Invoice Number",
      "Applicant Name",
      "Email",
      "Category",
      "Billing Cycle",
      "Instalment",
      "Amount",
      "Paid Amount",
      "Currency",
      "Payment Method",
      "Status",
      "Due Date",
      "Created At",
    ];
    const rows = filteredInvoices.map((i) => {
      const member = i.wcbn_member_id ? memberMap.get(i.wcbn_member_id) : null;
      const app = i.application_id ? appMap.get(i.application_id) : null;
      const cat = i.category_id ? categoryMap.get(i.category_id) : null;
      const appData = (app?.applicant_data as Record<string, any>) || {};
      const name =
        [member?.profiles?.first_name, member?.profiles?.last_name].filter(Boolean).join(" ") ||
        appData.full_name ||
        "Applicant";
      const instalmentStr = i.installment_number
        ? `${i.installment_number}/${i.installments_total || 1}`
        : "Full";

      return [
        `"${i.invoice_number}"`,
        `"${name}"`,
        `"${member?.profiles?.email || appData.email || ""}"`,
        `"${cat?.name || member?.category || "General"}"`,
        `"${i.billing_cycle || "annual"}"`,
        `"${instalmentStr}"`,
        i.amount,
        i.paid_amount,
        i.currency_code,
        `"${i.payment_method || ""}"`,
        i.status,
        i.due_date ?? "",
        i.created_at ? new Date(i.created_at).toLocaleDateString() : "",
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wcbn_finance_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully.");
  };

  return (
    <AdminPage
      title="Finance & Invoices"
      description="Bank transfer slip verification queue, membership dues collections, and grouped applicant billing ledger."
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. MASTER GLOBAL PAGE FILTER BAR (Before KPIs, filters the entire page)
        ========================================================================== */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search applicant name, email, invoice #, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto bg-muted/60 p-1 rounded-lg border border-border">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-7 text-xs rounded-md px-2.5"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "paid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("paid")}
                className={`h-7 text-xs rounded-md px-2.5 ${
                  statusFilter === "paid" ? "" : "text-emerald-600 hover:text-emerald-700"
                }`}
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className={`h-7 text-xs rounded-md px-2.5 ${
                  statusFilter === "pending" ? "" : "text-amber-600 hover:text-amber-700"
                }`}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "partial" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("partial")}
                className={`h-7 text-xs rounded-md px-2.5 ${
                  statusFilter === "partial" ? "" : "text-blue-600 hover:text-blue-700"
                }`}
              >
                Partial
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs h-9">
              <FileSpreadsheet className="size-3.5 text-emerald-600" /> Export CSV
            </Button>
            <Button onClick={() => setIssueOpen(true)} className="gap-1.5 text-xs h-9">
              <FilePlus2 className="size-3.5" /> Issue Manual Invoice
            </Button>
          </div>
        </div>

        {/* =========================================================================
            2. KPI SUMMARY BANNER (Directly reacts to the master filter)
        ========================================================================== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Invoiced</span>
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{money(totalInvoiced, "XAF")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{filteredInvoices.length} invoices generated</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Verified Revenue</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {money(totalCollected, "XAF")}
            </p>
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

          <div
            className={`rounded-2xl border p-5 shadow-card ${
              pendingPaymentsInQueue.length > 0
                ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Pending Slips</span>
              <Landmark className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingPaymentsInQueue.length}</p>
              {pendingSlipAmount > 0 && (
                <span className="text-xs text-muted-foreground">({money(pendingSlipAmount, "XAF")})</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting bank verification</p>
          </div>
        </div>

        {/* =========================================================================
            3. TWO DISTINCT TABS (Under KPIs, no table-level duplicate filters)
        ========================================================================== */}
        <Tabs defaultValue="transfers" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 border border-border">
              <TabsTrigger
                value="transfers"
                className="gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Landmark className="size-4" />
                Bank Transfer Verification Queue
                {pendingPaymentsInQueue.length > 0 && (
                  <Badge className="ml-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 h-4">
                    {pendingPaymentsInQueue.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="invoices"
                className="gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <FileText className="size-4" />
                Master Invoices Ledger
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                  {groupedInvoices.length} {groupedInvoices.length === 1 ? "Applicant" : "Applicants"}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* -------------------------------------------------------------------------
              TAB 1: BANK TRANSFER VERIFICATION QUEUE
          -------------------------------------------------------------------------- */}
          <TabsContent value="transfers" className="m-0">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight">Bank Transfer Verification Queue</h2>
                    {pendingPaymentsInQueue.length > 0 ? (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white">
                        {pendingPaymentsInQueue.length} Action Needed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                        Up to date
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review and verify applicant bank deposit/wire receipts. Confirming immediately inducts the applicant and marks their invoice as settled.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                {pendingPaymentsInQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
                    <CheckCircle2 className="size-10 text-emerald-500/80 mb-2" />
                    <p className="font-semibold text-foreground">No pending transfer receipts in queue</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-md">
                      When members choose Bank Transfer during checkout and upload their deposit slips, they will appear here for 1-click verification.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingPaymentsInQueue.map((payment) => {
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
                                <p className="text-xs text-muted-foreground">
                                  {payment.profiles?.email || member?.profiles?.email}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 font-medium ${
                                  archetype === "investor_mentor"
                                    ? "border-purple-500/40 text-purple-600 bg-purple-500/10"
                                    : "border-primary/40 text-primary bg-primary/10"
                                }`}
                              >
                                {archetype === "investor_mentor" ? "Investor / Mentor" : "Entrepreneur"}
                              </Badge>
                            </div>

                            <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-bold text-foreground">
                                  {money(Number(payment.amount), payment.currency_code)}
                                </span>
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
                                <span className="text-foreground">
                                  {new Date(payment.created_at).toLocaleDateString()}
                                </span>
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
                              {confirmPayment.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
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
          </TabsContent>

          {/* -------------------------------------------------------------------------
              TAB 2: MASTER INVOICES LEDGER (Grouped per applicant with instalment dropdown)
          -------------------------------------------------------------------------- */}
          <TabsContent value="invoices" className="m-0">
            <section className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
              <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Master Invoices Ledger</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consolidated applicant dues overview with expandable instalment schedules and payment tracking.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="size-4 text-primary" />
                  <span>Grouped by Applicant ({groupedInvoices.length} Records)</span>
                </div>
              </div>

              {/* Grouped Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 w-12 text-center font-semibold"></th>
                      <th className="p-4 font-semibold">Applicant / Member</th>
                      <th className="p-4 font-semibold">Category & Track</th>
                      <th className="p-4 font-semibold">Billing Schedule</th>
                      <th className="p-4 font-semibold text-right">Full Amount</th>
                      <th className="p-4 font-semibold text-right">Settled Amount</th>
                      <th className="p-4 font-semibold text-right">Balance Due</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-center">Instalments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groupedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-muted-foreground">
                          <Receipt className="size-10 mx-auto mb-2 text-muted-foreground/60" />
                          <p className="font-semibold text-foreground">No invoices match your filter criteria.</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Try adjusting the search query, period filter, or status pill above.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      groupedInvoices.map((group) => {
                        const isExpanded = Boolean(expandedGroups[group.key]);
                        const isPaid = group.overallStatus === "paid";
                        const isPartial = group.overallStatus === "partial";
                        const remainingBalance = Math.max(0, group.totalAmount - group.totalPaid);

                        return (
                          <React.Fragment key={group.key}>
                            {/* Master Applicant Row */}
                            <tr
                              className={`hover:bg-muted/20 transition-colors cursor-pointer ${
                                isExpanded ? "bg-muted/30" : ""
                              }`}
                              onClick={() => toggleGroupExpand(group.key)}
                            >
                              {/* Dropdown Chevron */}
                              <td className="p-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupExpand(group.key);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="size-4 rotate-180 transition-transform" />
                                  ) : (
                                    <ChevronDown className="size-4 transition-transform" />
                                  )}
                                </Button>
                              </td>

                              {/* Applicant Profile */}
                              <td className="p-4">
                                <div className="font-bold text-foreground text-sm leading-tight">
                                  {group.applicantName}
                                </div>
                                <div className="text-xs text-muted-foreground">{group.applicantEmail}</div>
                                {group.wcaId && (
                                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                    ID: {group.wcaId}
                                  </div>
                                )}
                              </td>

                              {/* Category & Track */}
                              <td className="p-4">
                                <div className="text-xs font-semibold text-foreground">{group.categoryName}</div>
                                <span
                                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                                    group.archetype === "investor_mentor"
                                      ? "text-purple-600 bg-purple-500/10 border border-purple-500/20"
                                      : "text-primary bg-primary/10 border border-primary/20"
                                  }`}
                                >
                                  {group.archetype === "investor_mentor" ? "Investor / Mentor" : "Entrepreneur"}
                                </span>
                              </td>

                              {/* Billing Cycle / Schedule */}
                              <td className="p-4">
                                <div className="capitalize text-xs font-medium text-foreground">
                                  {group.billingCycle.replace(/_/g, " ")} Plan
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {group.invoices.length} {group.invoices.length === 1 ? "instalment" : "instalments"}
                                </div>
                              </td>

                              {/* Full Amount (Total Billed) */}
                              <td className="p-4 font-bold text-sm text-right whitespace-nowrap text-foreground">
                                {money(group.totalAmount, group.currency)}
                              </td>

                              {/* Total Settled */}
                              <td className="p-4 text-xs text-right whitespace-nowrap">
                                <span
                                  className={
                                    group.totalPaid > 0
                                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {money(group.totalPaid, group.currency)}
                                </span>
                              </td>

                              {/* Remaining Balance */}
                              <td className="p-4 text-xs text-right whitespace-nowrap">
                                <span
                                  className={
                                    remainingBalance > 0
                                      ? "text-amber-600 dark:text-amber-400 font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {money(remainingBalance, group.currency)}
                                </span>
                              </td>

                              {/* Overall Status */}
                              <td className="p-4 text-center whitespace-nowrap">
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
                                  {group.overallStatus}
                                </Badge>
                              </td>

                              {/* Dropdown Action Trigger */}
                              <td className="p-4 text-center whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupExpand(group.key);
                                  }}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronDown className="size-3.5 rotate-180" /> Hide
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="size-3.5" /> Details ({group.invoices.length})
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>

                            {/* Expandable Dropdown Row for Instalment Payments */}
                            {isExpanded && (
                              <tr className="bg-muted/15 border-b border-border">
                                <td colSpan={9} className="p-4 sm:p-6 pl-6 sm:pl-12">
                                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="size-4 text-primary" />
                                        <h4 className="font-bold text-sm text-foreground">
                                          Instalment Invoices for {group.applicantName}
                                        </h4>
                                        <Badge variant="secondary" className="text-[10px]">
                                          {group.invoices.length} Total
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                                        <span>
                                          Total Billed:{" "}
                                          <strong className="text-foreground">
                                            {money(group.totalAmount, group.currency)}
                                          </strong>
                                        </span>
                                        <span>
                                          Settled:{" "}
                                          <strong className="text-emerald-600">
                                            {money(group.totalPaid, group.currency)}
                                          </strong>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Nested Instalment Table */}
                                    <div className="overflow-x-auto rounded-xl border border-border bg-background">
                                      <table className="w-full text-xs text-left">
                                        <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border">
                                          <tr>
                                            <th className="p-3 font-semibold">Instalment #</th>
                                            <th className="p-3 font-semibold">Invoice Number</th>
                                            <th className="p-3 font-semibold">Billing Window & Due</th>
                                            <th className="p-3 font-semibold">Payment Method</th>
                                            <th className="p-3 font-semibold text-right">Amount</th>
                                            <th className="p-3 font-semibold text-right">Settled</th>
                                            <th className="p-3 font-semibold text-center">Status</th>
                                            <th className="p-3 font-semibold text-center">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {group.invoices.map((inv, idx) => {
                                            const invPaid = inv.status === "paid";
                                            const invPartial = inv.status === "partial";
                                            const instalmentLabel = inv.installment_number
                                              ? `Instalment ${inv.installment_number} of ${
                                                  inv.installments_total || group.invoices.length
                                                }`
                                              : `Invoice #${idx + 1}`;

                                            return (
                                              <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-medium text-foreground">
                                                  <Badge variant="outline" className="text-[10px]">
                                                    {instalmentLabel}
                                                  </Badge>
                                                </td>
                                                <td className="p-3 font-mono font-medium text-foreground">
                                                  {inv.invoice_number}
                                                </td>
                                                <td className="p-3 text-muted-foreground whitespace-nowrap">
                                                  {inv.period_start && inv.period_end ? (
                                                    <span>
                                                      {inv.period_start} → {inv.period_end}
                                                    </span>
                                                  ) : (
                                                    <span>Due: {inv.due_date || "Upon receipt"}</span>
                                                  )}
                                                </td>
                                                <td className="p-3 text-muted-foreground capitalize">
                                                  {formatPaymentMethod(inv.payment_method)}
                                                </td>
                                                <td className="p-3 font-semibold text-right whitespace-nowrap text-foreground">
                                                  {money(Number(inv.amount), inv.currency_code)}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                  <span
                                                    className={
                                                      Number(inv.paid_amount) > 0
                                                        ? "text-emerald-600 font-semibold"
                                                        : "text-muted-foreground"
                                                    }
                                                  >
                                                    {money(Number(inv.paid_amount), inv.currency_code)}
                                                  </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[10px] capitalize font-medium ${
                                                      invPaid
                                                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                                        : invPartial
                                                        ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                                                        : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                                    }`}
                                                  >
                                                    {inv.status}
                                                  </Badge>
                                                </td>
                                                <td className="p-3 text-center">
                                                  {!invPaid ? (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                      disabled={markInvoicePaid.isPending}
                                                      onClick={() => {
                                                        if (
                                                          window.confirm(
                                                            `Mark invoice ${inv.invoice_number} (${money(
                                                              Number(inv.amount),
                                                              inv.currency_code
                                                            )}) as settled?`
                                                          )
                                                        ) {
                                                          markInvoicePaid.mutate(inv);
                                                        }
                                                      }}
                                                    >
                                                      <CheckCircle2 className="size-3.5 mr-1" /> Mark Paid
                                                    </Button>
                                                  ) : (
                                                    <span className="text-emerald-600 font-medium inline-flex items-center gap-1 text-[11px]">
                                                      <CheckCircle2 className="size-3.5" /> Settled
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* =========================================================================
          SLIP RECEIPT INSPECTION DIALOG
      ========================================================================== */}
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
                    {[inspectingPayment.profiles?.first_name, inspectingPayment.profiles?.last_name]
                      .filter(Boolean)
                      .join(" ") || inspectingPayment.profiles?.email}
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
              {confirmPayment.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Confirm Payment & Activate Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          ISSUE MANUAL CATEGORY INVOICE DIALOG
      ========================================================================== */}
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
              {issueInvoiceMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FilePlus2 className="size-3.5" />
              )}
              Generate & Issue Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
