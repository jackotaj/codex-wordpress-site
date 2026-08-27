"use client";

import { useState } from "react";
import { CalendarCheck, CaretDown, ChatCircleDots, Check, Clock, Gauge, MagnifyingGlass, Robot, SidebarSimple, SignOut, Sparkle, Users } from "@phosphor-icons/react";
import type { CustomerEvent, DashboardSnapshot, QueuedMessage } from "@/lib/types";
import { useRouter } from "next/navigation";

const nav = [
  { label: "Overview", icon: Gauge, active: true },
];

function eventTime(event: CustomerEvent): string {
  const date = new Date(event.timestamp);
  if (Number.isNaN(date.getTime())) return event.timestamp;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function Dashboard({ snapshot, managerName }: { snapshot: DashboardSnapshot; managerName: string }) {
  const router = useRouter();
  const { customers, stats, runtime } = snapshot;
  const [activeId, setActiveId] = useState(customers[0]?.id ?? "");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [approval, setApproval] = useState<"idle" | "sending" | "queued" | "demo" | "handled" | "error">("idle");
  const [approvalError, setApprovalError] = useState("");
  const [dismissedId, setDismissedId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const filteredCustomers = customers.filter((item) => {
    if (filter === "recommended" && !item.recommendation) return false;
    const term = query.trim().toLowerCase();
    return !term || [item.name, item.vehicle, item.source, item.status].some((value) => value.toLowerCase().includes(term));
  });
  const customer = filteredCustomers.find((item) => item.id === activeId) ?? filteredCustomers[0];
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  async function approveRecommendation() {
    if (!customer?.recommendation) return;
    setApproval("sending");
    setApprovalError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          channel: customer.recommendation.channel,
          body: customer.recommendation.body,
        }),
      });
      const result = await response.json() as Partial<QueuedMessage> & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Approved message was not queued.");
      if (!result.status) throw new Error("Approved message returned an invalid queue status.");
      if (result.status === "DEMO_ONLY") setApproval("demo");
      else if (result.status === "APPROVED") setApproval("queued");
      else if (result.status === "ALREADY_SENT") setApproval("handled");
      else throw new Error(`The previous action is ${result.status.toLowerCase()} and was not queued again.`);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : "Approved message was not queued.");
      setApproval("error");
    }
  }

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Sparkle weight="fill" /></div><div><strong>Sarah</strong><span>Revenue Assistant</span></div></div>
        <div className="store-select"><span className="store-icon">SH</span><div><strong>Safford Hyundai</strong><span>Leesburg, VA</span></div><CaretDown /></div>
        <nav>{nav.map(({ label, icon: Icon, active }) => <button className={active ? "nav-active" : ""} key={label}><Icon size={20} weight={active ? "fill" : "regular"} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="system-status"><span className={`pulse ${runtime.state === "unavailable" ? "pulse-error" : ""}`} /><div><strong>{runtime.label}</strong><small>{runtime.dataMode === "demo" ? "No live data is being stored" : "PostgreSQL customer timeline"}</small></div></div><div className="user"><span>{managerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{managerName}</strong><small>General Sales Manager</small></div><button type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><SignOut size={19} /></button></div></div>
      </aside>

      <section className="content">
        <header><div><button className="mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu"><SidebarSimple /></button><span className="eyebrow">{today}</span><h1>Good morning, {managerName.split(/\s+/)[0]}</h1><p>Review customer activity and approve the actions that are safe to execute.</p></div><div className="header-actions"><div className="search"><MagnifyingGlass /><input aria-label="Search customers" placeholder="Search customers" value={query} onChange={(event) => { setQuery(event.target.value); setApproval("idle"); setApprovalError(""); setDismissedId(""); }} /></div></div></header>

        <section className={`runtime-banner runtime-${runtime.state}`} role={runtime.state === "unavailable" ? "alert" : "status"}><strong>{runtime.label}</strong><span>{runtime.detail}</span></section>

        <section className="stats-grid">{stats.map((stat, index) => <article className="stat" key={stat.label}><div className={`stat-icon stat-${index}`} >{index === 0 ? <Users /> : index === 1 ? <ChatCircleDots /> : index === 2 ? <CalendarCheck /> : <Robot />}</div><span>{stat.label}</span><div><strong>{stat.value}</strong><em>{stat.delta}</em></div><small>{stat.caption}</small></article>)}</section>

        <div className="section-heading"><div><h2>Customer priority queue</h2><p>Ranked by captured buying intent and urgency</p></div><div className="filters"><label><span className="sr-only">Filter leads</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setApproval("idle"); setApprovalError(""); setDismissedId(""); }}><option value="all">All leads</option><option value="recommended">Recommendation ready</option></select><CaretDown size={14} /></label></div></div>

        {customer ? <div className="workspace">
          <section className="queue" aria-label="Customer priority queue">
            <div className="queue-head"><span>Customer</span><span>Intent</span><span>Next best action</span></div>
            {filteredCustomers.map((lead) => <button key={lead.id} onClick={() => { setActiveId(lead.id); setApproval("idle"); setApprovalError(""); setDismissedId(""); }} className={`lead-row ${lead.id === customer.id ? "selected" : ""}`}>
              <span className={`avatar intent-${lead.intent > 85 ? "high" : lead.intent > 75 ? "medium" : "low"}`}>{lead.initials}</span>
              <span className="lead-name"><strong>{lead.name}</strong><small>{lead.vehicle}</small><em>{lead.status}</em></span>
              <span className="intent"><strong>{lead.intent}%</strong><span><i style={{ width: `${lead.intent}%` }} /></span><small>Buying intent</small></span>
              <span className="action"><strong>{lead.action}</strong><small>{lead.reason}</small></span><CaretDown className="row-arrow" />
            </button>)}
            {filteredCustomers.length === 0 ? <div className="queue-empty">No customers match this filter.</div> : null}
          </section>

          <aside className="customer-panel">
            <div className="panel-top"><div className="profile"><span>{customer.initials}</span><div><strong>{customer.name}</strong><small>Contact detail stays in VinSolutions</small></div></div></div>
            <div className="vehicle"><div><span>VEHICLE OF INTEREST</span><strong>{customer.vehicle}</strong><small>{customer.source} · Lead #{customer.id.replace("vs-", "")}</small></div><span className="hot"><span /> {customer.status}</span></div>

            {customer.recommendation && dismissedId !== customer.id ? <div className="recommendation"><div className="recommend-head"><span><Sparkle weight="fill" /> SARAH RECOMMENDS</span><em>{Math.round(customer.recommendation.confidence * 100)}% confidence</em></div><strong>{customer.recommendation.title}</strong><p>{customer.recommendation.reason}</p><div className="draft"><span>{customer.recommendation.channel} DRAFT</span><p>{customer.recommendation.body}</p></div><small className="execution-note">Approval records the draft for connector execution; it does not claim external delivery.</small><div className="recommend-actions"><button onClick={approveRecommendation} disabled={approval === "sending" || approval === "queued" || approval === "demo" || approval === "handled"} className={approval === "queued" || approval === "handled" ? "approved" : "primary"}>{approval === "sending" ? "Queueing…" : approval === "queued" ? <><Check weight="bold" /> Approved & queued</> : approval === "demo" ? "Demo only — not queued" : approval === "handled" ? <><Check weight="bold" /> Already recorded sent</> : approval === "error" ? "Try again" : "Approve & queue"}</button><button onClick={() => setDismissedId(customer.id)}>Dismiss</button></div>{approvalError ? <p className="action-error" role="alert">{approvalError}</p> : null}</div> : null}
            {customer.events.length ? <>
              <div className="timeline-heading"><div><h3>Customer timeline</h3><span>Source of truth</span></div>{customer.vinSolutionsUrl ? <a href={customer.vinSolutionsUrl} target="_blank" rel="noreferrer">View in VinSolutions ↗</a> : <span className="crm-link-disabled">CRM link unavailable</span>}</div>
              <div className="timeline">{customer.events.map((event, index) => <div className="event" key={event.id}><div className={`event-icon ${event.type.toLowerCase()}`}>{event.type === "APPOINTMENT_CREATED" ? <CalendarCheck /> : event.type === "CUSTOMER_REPLIED" ? <ChatCircleDots /> : event.type === "AI_TEXT_SENT" ? <Sparkle /> : <Users />}</div><div className="event-content"><div><strong>{event.title}</strong><time>{eventTime(event)}</time></div><p>{event.detail}</p><span>{event.channel}</span></div>{index < customer.events.length - 1 && <i />}</div>)}</div>
            </> : <div className="empty"><Clock size={34} /><h3>No captured timeline yet</h3><p>Recent activity for {customer.name} will appear here after a verified connector event is persisted.</p></div>}
          </aside>
        </div> : <div className="no-data"><Clock size={34} /><h2>{customers.length ? "No customers match this view" : "No live customer data available"}</h2><p>{customers.length ? "Clear the search or change the queue filter." : runtime.detail}</p></div>}
        <footer><span><span className={`pulse ${runtime.state === "unavailable" ? "pulse-error" : ""}`} /> {runtime.label}</span><span>{runtime.pendingActions} approved actions pending</span></footer>
      </section>
    </main>
  );
}
