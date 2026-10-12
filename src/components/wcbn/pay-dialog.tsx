import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle, Edit2, Landmark, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { chargeCard, chargeMobileMoney, checkPayment, sanitizeMobileMoneyPhone } from "@/lib/payments.functions";

type Stage = "starting" | "waiting" | "success" | "failed";
declare global { interface Window { FlutterwaveCheckout?: (o: Record<string, unknown>) => { close: () => void } } }

function loadInline() {
  return new Promise<void>((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the card payment form."));
    document.body.appendChild(s);
  });
}

export function PayDialog({
  invoiceId,
  method,
  phone,
  network,
  cardData,
  publicKey,
  customer,
  onClose,
  onSwitchToBankTransfer,
  onPhoneChange,
}: {
  invoiceId: string | null;
  method: "mobile_money" | "card";
  phone: string;
  network?: string;
  cardData?: {
    cardNumber: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
  } | null;
  publicKey: string | null;
  customer: { email: string; name: string; phone: string };
  onClose: () => void;
  onSwitchToBankTransfer?: () => void;
  onPhoneChange?: (phone: string, network: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("starting");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);

  // Local phone and network states for interactive modification
  const [activePhone, setActivePhone] = useState(phone);
  const [activeNetwork, setActiveNetwork] = useState(network || "MTN");
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  useEffect(() => {
    setActivePhone(phone);
  }, [phone]);

  useEffect(() => {
    if (network) setActiveNetwork(network);
  }, [network]);

  const handlePhoneInputChange = (newVal: string) => {
    setActivePhone(newVal);
    const { detectedNetwork } = sanitizeMobileMoneyPhone(newVal, "XAF");
    if (detectedNetwork) {
      setActiveNetwork(detectedNetwork);
    }
  };

  useEffect(() => {
    if (!invoiceId) return;
    alive.current = true;
    setStage("starting");
    setError("");

    const poll = async (txRef?: string, transactionId?: string) => {
      const until = Date.now() + 4 * 60_000;
      while (alive.current && Date.now() < until) {
        try {
          const r = await checkPayment({ data: { invoiceId, txRef, transactionId } });
          if (r.status === "successful") {
            if (alive.current) setStage("success");
            return;
          }
          if (r.status === "failed") throw new Error("The payment was declined or cancelled.");
        } catch (e) {
          if (alive.current) {
            setError((e as Error).message);
            setStage("failed");
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (alive.current) {
        setError("We did not receive a confirmation in time. Please try again or switch number.");
        setStage("failed");
      }
    };

    (async () => {
      try {
        if (method === "mobile_money") {
          const cleanPhone = activePhone || phone;
          if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 8) {
            throw new Error("Please specify a valid mobile money phone number.");
          }
          const res = await chargeMobileMoney({
            data: {
              invoiceId,
              phone: cleanPhone,
              network: activeNetwork,
            },
          });
          if (res.redirect) window.open(res.redirect, "_blank", "noopener");
          setStage("waiting");
          await poll(res.txRef);
        } else {
          if (cardData && cardData.cardNumber) {
            try {
              const res = await chargeCard({
                data: {
                  invoiceId,
                  cardNumber: cardData.cardNumber,
                  cvv: cardData.cvv,
                  expiryMonth: cardData.expiryMonth,
                  expiryYear: cardData.expiryYear,
                  cardholderName: cardData.cardholderName,
                  origin: window.location.origin,
                },
              });
              if (res.redirect) {
                window.open(res.redirect, "_blank", "noopener");
              }
              setStage("waiting");
              await poll(res.txRef);
              return;
            } catch (cardErr: any) {
              console.error("Direct chargeCard error:", cardErr);
              throw cardErr;
            }
          } else {
            throw new Error("Card information is required to initiate direct payment.");
          }
        }
      } catch (e) {
        if (alive.current) {
          setError((e as Error).message);
          setStage("failed");
        }
      }
    })();

    return () => {
      alive.current = false;
    };
  }, [invoiceId, method, publicKey, attempt]);

  const handleApplyPhoneAndRetry = () => {
    if (onPhoneChange) onPhoneChange(activePhone, activeNetwork);
    setIsEditingPhone(false);
    setAttempt((a) => a + 1);
  };

  return (
    <Dialog open={!!invoiceId} onOpenChange={(o) => { if (!o && stage !== "success") onClose(); }}>
      <DialogContent className="max-w-md text-center" onInteractOutside={(e) => e.preventDefault()}>
        {stage === "success" ? (
          <div className="py-2 space-y-4">
            <CheckCircle2 className="mx-auto size-14 text-primary" />
            <DialogTitle className="text-xl font-bold">Payment successful</DialogTitle>
            <DialogDescription className="text-sm">
              Welcome to WCBN! Your membership and profile are now activated.
            </DialogDescription>
            <Button className="mt-2 w-full font-semibold" onClick={() => window.location.assign("/portal")}>
              Go to my dashboard
            </Button>
          </div>
        ) : stage === "failed" ? (
          <div className="py-2 space-y-4">
            <XCircle className="mx-auto size-12 text-destructive" />
            <DialogTitle className="text-lg font-bold">Payment not completed</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground whitespace-pre-wrap">
              {error}
            </DialogDescription>

            {/* In-dialog mobile money modification if failed */}
            {method === "mobile_money" && (
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Billing Mobile Money:</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{activePhone} ({activeNetwork})</span>
                </div>

                {isEditingPhone ? (
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Change Phone Number</Label>
                      <div className="relative mt-1">
                        <Input
                          className="h-8 text-xs font-mono pr-28"
                          inputMode="tel"
                          value={activePhone}
                          onChange={(e) => handlePhoneInputChange(e.target.value)}
                          placeholder="e.g. 678135701 or 2376..."
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              activeNetwork === "MTN"
                                ? "bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-950"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            ⚡ {activeNetwork === "MTN" ? "MTN MoMo" : "Orange Money"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingPhone(true)}
                    className="h-6 text-[11px] p-0 text-primary hover:underline"
                  >
                    <Edit2 className="size-3 mr-1" /> Use a different mobile money number
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={onClose}>
                  Close
                </Button>
                <Button
                  className="flex-1 text-xs font-semibold gap-1"
                  onClick={handleApplyPhoneAndRetry}
                >
                  <RefreshCw className="size-3" /> Retry Payment
                </Button>
              </div>

              {onSwitchToBankTransfer && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onSwitchToBankTransfer();
                  }}
                  className="w-full text-xs gap-1.5"
                >
                  <Landmark className="size-3.5 text-amber-600" /> Pay via Direct Bank Transfer Instead
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            {method === "mobile_money" ? (
              <Smartphone className="mx-auto size-12 text-primary" />
            ) : (
              <Loader2 className="mx-auto size-12 animate-spin text-primary" />
            )}

            <div>
              <DialogTitle className="text-base font-bold">
                {stage === "starting"
                  ? "Starting payment…"
                  : method === "mobile_money"
                  ? "Approve prompt on your phone"
                  : "Complete your card payment"}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-xs text-muted-foreground">
                {method === "mobile_money"
                  ? `A payment authorization request was pushed to ${activeNetwork} ${activePhone}. Enter your PIN on your handset to approve.`
                  : "Enter your card details in the secure form. Keep this window open."}
              </DialogDescription>
            </div>

            {/* Waiting spinner & mobile money modifier */}
            {method === "mobile_money" && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-2 text-left">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Debiting:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {activeNetwork} ({activePhone})
                  </span>
                </div>

                {!isEditingPhone ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Edit2 className="size-3" /> Not receiving the prompt? Change number or network
                  </button>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Input
                      className="h-8 text-xs font-mono"
                      inputMode="tel"
                      value={activePhone}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      placeholder="e.g. 670000000"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveNetwork("MTN")}
                        className={`flex-1 rounded-lg py-1 text-xs font-semibold border transition ${
                          activeNetwork === "MTN" ? "bg-amber-400/20 border-amber-500 text-amber-900 dark:text-amber-300" : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNetwork("ORANGE")}
                        className={`flex-1 rounded-lg py-1 text-xs font-semibold border transition ${
                          activeNetwork === "ORANGE" ? "bg-orange-500/20 border-orange-500 text-orange-900 dark:text-orange-300" : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        Orange Money
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleApplyPhoneAndRetry}
                      className="w-full h-7 text-xs font-semibold mt-1"
                    >
                      Resend prompt to this number
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Awaiting network confirmation…</span>
            </div>

            <div className="pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
                Cancel / Choose another method
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
