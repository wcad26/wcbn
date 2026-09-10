import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, BriefcaseBusiness, CircleDollarSign, ClipboardCheck, FileText, LogOut, Menu, Settings2, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AccessGuard } from "./access-guard";

const memberLinks=[["Overview","/portal",BarChart3],["Application","/portal/application",ClipboardCheck],["My business","/portal/business",BriefcaseBusiness],["Contributions","/portal/contributions",CircleDollarSign],["Impact review","/portal/impact",FileText]] as const;
const adminLinks=[["Overview","/admin",BarChart3],["Applications","/admin/applications",ClipboardCheck],["Members","/admin/members",Users],["Businesses","/admin/businesses",BriefcaseBusiness],["Contributions","/admin/contributions",CircleDollarSign],["Criteria","/admin/criteria",Settings2]] as const;

export function PortalShell({ children, admin=false }: { children: ReactNode; admin?: boolean }) {
  const [open,setOpen]=useState(false);const navigate=useNavigate();const links=admin?adminLinks:memberLinks;
  async function signOut(){await supabase.auth.signOut();navigate({to:"/auth"})}
  return <AccessGuard admin={admin}><div className="min-h-screen bg-muted/40"><aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink p-5 text-primary-foreground transition-transform lg:translate-x-0 ${open?"translate-x-0":"-translate-x-full"}`}><div className="flex items-center justify-between"><Link to={admin?"/admin":"/portal"} className="font-display text-2xl font-bold">WCBN</Link><Button size="icon" variant="ghost" className="lg:hidden" onClick={()=>setOpen(false)}><X/></Button></div><p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-gold">{admin?"Leadership portal":"Member portal"}</p><nav className="mt-10 space-y-1">{links.map(([label,to,Icon])=><Link key={to} to={to} onClick={()=>setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-primary-foreground/60 transition hover:bg-primary-foreground/10 hover:text-primary-foreground" activeProps={{className:"bg-primary text-primary-foreground"}}><Icon className="size-4"/>{label}</Link>)}</nav><Button variant="ghost" className="absolute bottom-5 left-5 right-5 justify-start text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={signOut}><LogOut/>Sign out</Button></aside><div className="lg:pl-64"><header className="flex h-16 items-center justify-between border-b border-border bg-background px-5 lg:px-8"><Button size="icon" variant="ghost" className="lg:hidden" onClick={()=>setOpen(true)}><Menu/></Button><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{admin?"Network operations":"World Changers Business Network"}</p><span className="size-9 rounded-full bg-secondary"/></header><main className="mx-auto max-w-[1500px] p-5 lg:p-8">{children}</main></div></div></AccessGuard>;
}
