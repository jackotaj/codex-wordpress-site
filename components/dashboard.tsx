"use client";

import { useState } from "react";
import { Bell, CalendarCheck, CaretDown, ChartLineUp, ChatCircleDots, Check, Clock, DotsThree, Gauge, MagnifyingGlass, Pulse, Robot, SidebarSimple, Sparkle, Users } from "@phosphor-icons/react";
import { customers, stats } from "@/lib/mock-data";

const nav = [
  { label: "Overview", icon: Gauge, active: true },
  { label: "Priority queue", icon: ChartLineUp, badge: "12" },
  { label: "Conversations", icon: ChatCircleDots, badge: "7" },
  { label: "Appointments", icon: CalendarCheck },
  { label: "Customers", icon: Users },
];

export function Dashboard() {
  const [activeId, setActiveId] = useState(customers[0].id);
  const [filter] = useState("All leads");
  const [approved, setApproved] = useState(false);
  const customer = customers.find((item) => item.id === activeId) ?? customers[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkle weight="fill" /></div><div><strong>Sarah</strong><span>Revenue Assistant</span></div></div>
        <div className="store-select"><span className="store-icon">SH</span><div><strong>Safford Hyundai</strong><span>Leesburg, VA</span></div><CaretDown /></div>
        <nav>{nav.map(({ label, icon: Icon, active, badge }) => <button className={active ? "nav-active" : ""} key={label}><Icon size={20} weight={active ? "fill" : "regular"} /><span>{label}</span>{badge && <em>{badge}</em>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="system-status"><span className="pulse" /><div><strong>Sarah is active</strong><small>Monitoring new activity</small></div></div><button><Pulse size={20} /><span>Activity log</span></button><button><SidebarSimple size={20} /><span>Settings</span></button><div className="user"><span>TM</span><div><strong>Todd Miller</strong><small>General Sales Manager</small></div><DotsThree size={20} /></div></div>
      </aside>

      <section className="content">
        <header><div><button className="mobile-menu"><SidebarSimple /></button><span className="eyebrow">Sunday, August 23</span><h1>Good morning, Todd</h1><p>Sarah is working your leads. Here&apos;s what needs your attention.</p></div><div className="header-actions"><div className="search"><MagnifyingGlass /><input aria-label="Search customers" placeholder="Search customers" /><kbd>⌘ K</kbd></div><button className="bell"><Bell /><span /></button></div></header>

        <section className="stats-grid">{stats.map((stat, index) => <article className="stat" key={stat.label}><div className={`stat-icon stat-${index}`} >{index === 0 ? <Users /> : index === 1 ? <ChatCircleDots /> : index === 2 ? <CalendarCheck /> : <Robot />}</div><span>{stat.label}</span><div><strong>{stat.value}</strong><em>{stat.delta}</em></div><small>{stat.caption}</small></article>)}</section>

        <div className="section-heading"><div><h2>Customer priority queue</h2><p>Ranked by buying intent and urgency</p></div><div className="filters"><button>{filter}<CaretDown size={14} /></button><button>Today<CaretDown size={14} /></button></div></div>

        <div className="workspace">
          <section className="queue" aria-label="Customer priority queue">
            <div className="queue-head"><span>Customer</span><span>Intent</span><span>Next best action</span></div>
            {customers.map((lead) => <button key={lead.id} onClick={() => { setActiveId(lead.id); setApproved(false); }} className={`lead-row ${lead.id === activeId ? "selected" : ""}`}>
              <span className={`avatar intent-${lead.intent > 85 ? "high" : lead.intent > 75 ? "medium" : "low"}`}>{lead.initials}</span>
              <span className="lead-name"><strong>{lead.name}</strong><small>{lead.vehicle}</small><em>{lead.status}</em></span>
              <span className="intent"><strong>{lead.intent}%</strong><span><i style={{ width: `${lead.intent}%` }} /></span><small>Buying intent</small></span>
              <span className="action"><strong>{lead.action}</strong><small>{lead.reason}</small></span><CaretDown className="row-arrow" />
            </button>)}
            <button className="view-all">View all 12 priority customers <span>→</span></button>
          </section>

          <aside className="customer-panel">
            <div className="panel-top"><div className="profile"><span>{customer.initials}</span><div><strong>{customer.name}</strong><small>{customer.phone} · {customer.email}</small></div></div><button><DotsThree /></button></div>
            <div className="vehicle"><div><span>VEHICLE OF INTEREST</span><strong>{customer.vehicle}</strong><small>{customer.source} · Lead #{customer.id.replace("vs-", "")}</small></div><span className="hot"><span /> {customer.status}</span></div>

            {customer.events.length ? <>
              <div className="recommendation"><div className="recommend-head"><span><Sparkle weight="fill" /> SARAH RECOMMENDS</span><em>92% confidence</em></div><strong>Confirm the appointment</strong><p>John is highly engaged and has agreed to Saturday at 1 PM. Send a quick confirmation while intent is high.</p><div className="draft"><span>SMS DRAFT</span><p>Perfect, John — I have you down for Saturday at 1 PM to drive the Palisade Calligraphy. I&apos;ll make sure it&apos;s ready for you. — Sarah, Todd&apos;s assistant</p></div><div className="recommend-actions"><button onClick={() => setApproved(true)} className={approved ? "approved" : "primary"}>{approved ? <><Check weight="bold" /> Approved & queued</> : "Review & send"}</button><button>Dismiss</button></div></div>
              <div className="timeline-heading"><div><h3>Customer timeline</h3><span>Source of truth</span></div><button>View in VinSolutions ↗</button></div>
              <div className="timeline">{customer.events.map((event, index) => <div className="event" key={event.id}><div className={`event-icon ${event.type.toLowerCase()}`}>{event.type === "APPOINTMENT_CREATED" ? <CalendarCheck /> : event.type === "CUSTOMER_REPLIED" ? <ChatCircleDots /> : event.type === "AI_TEXT_SENT" ? <Sparkle /> : <Users />}</div><div className="event-content"><div><strong>{event.title}</strong><time>{event.timestamp}</time></div><p>{event.detail}</p><span>{event.channel}</span></div>{index < customer.events.length - 1 && <i />}</div>)}</div>
            </> : <div className="empty"><Clock size={34} /><h3>Timeline is syncing</h3><p>Recent activity for {customer.name} will appear here from the connected manager session.</p></div>}
          </aside>
        </div>
        <footer><span><span className="pulse" /> VinSolutions connector online</span><span>Last sync 34 seconds ago</span><span>147 events captured today</span></footer>
      </section>
    </main>
  );
}
