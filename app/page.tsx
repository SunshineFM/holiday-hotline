"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarCheck2,
  Headphones,
  MessageCircleMore,
  Mic,
  Phone,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import Desk from "./desk";

const cadence = [
  {
    number: "01",
    icon: Mic,
    title: "Take a PreShift",
    copy: "A manager speaks or types what is different today. It takes about a minute.",
  },
  {
    number: "02",
    icon: Headphones,
    title: "Holiday Hotline answers",
    copy: "Holiday Helper has the approved brief and starts a natural conversation with the caller.",
  },
  {
    number: "03",
    icon: UserRoundCheck,
    title: "People handle the exceptions",
    copy: "Only questions that need a person become a simple, actionable request for the team.",
  },
];

export default function Home() {
  const [tab, setTab] = useState<"hotline" | "desk">("hotline");
  const hotline = useQuery(api.stores.publicHotline);

  return (
    <main>
      <header className="header">
        <Link className="brand preshift-brand" href="/">
          <span className="brand-icon">
            <Mic size={21} />
          </span>
          pre<span className="brand-shift">shift</span>
          <span className="brand-star">✳</span>
          <span className="brand-context">HOLIDAY HOTLINE PILOT</span>
        </Link>
        <nav aria-label="Main navigation">
          <button
            className={tab === "hotline" ? "selected" : ""}
            onClick={() => setTab("hotline")}
          >
            How it works
          </button>
          <button
            className={tab === "desk" ? "selected" : ""}
            onClick={() => setTab("desk")}
          >
            Take a PreShift <ArrowRight size={15} />
          </button>
        </nav>
      </header>

      <div className="season pilot-banner">
        <span>THE HOLIDAY HOTLINE PILOT · THANKSGIVING — NEW YEAR’S DAY</span>
        <span>ONE BRIEF. A MORE HELPFUL CALL.</span>
      </div>

      {tab === "hotline" ? (
        <>
          <section className="hero preshift-hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="small-rule" />
                A DAILY RITUAL FOR YOUR DIGITAL EMPLOYEE
              </div>
              <h1>
                Before the rush, give your digital employee a <em>PreShift.</em>
              </h1>
              <p className="intro">
                PreShift turns a quick manager update into the current context
                for a Holiday Hotline. Callers get a helpful first answer;
                your team gets involved only when it matters.
              </p>
              <div className="hero-promise">
                <ShieldCheck size={19} />
                <span>
                  A small holiday pilot: no POS connection, no customer list,
                  and no new system for staff to manage.
                </span>
              </div>
              <button className="primary hero-cta" onClick={() => setTab("desk")}>
                See the manager’s PreShift <ArrowRight size={18} />
              </button>
            </div>

            <div className="pilot-card">
              <div className="card-top">
                <span>THE CUSTOMER-FACING MVP</span>
                <Phone size={21} />
              </div>
              <div className="pilot-card-title">
                <span className="pill dark-pill">HOLIDAY HOTLINE</span>
                <h2>A helpful call, before the handoff.</h2>
                <p>
                  Holiday Helper greets callers, uses today’s approved brief,
                  and brings in a person when the conversation calls for one.
                </p>
              </div>
              <div className="number-area">
                <span className="pill">
                  {hotline?.hotline ? "CALL THE PILOT LINE" : "DEMO EXPERIENCE"}
                </span>
                <strong>{hotline?.hotline ?? "Your Holiday Hotline"}</strong>
                <span>
                  {hotline?.hotline
                    ? hotline.name
                    : "Start with your manager-approved daily brief."}
                </span>
              </div>
              {hotline?.hotline ? (
                <a className="primary" href={`tel:${hotline.hotline}`}>
                  <Phone size={18} /> Call Holiday Hotline
                </a>
              ) : (
                <button className="primary" onClick={() => setTab("desk")}>
                  Try a practice PreShift <ArrowRight size={18} />
                </button>
              )}
              <div className="pilot-mvp-note">
                <MessageCircleMore size={17} />
                <span>PreShift → Holiday Helper → team request, only when needed.</span>
              </div>
            </div>
          </section>

          <section className="cadence-section" aria-labelledby="cadence-title">
            <div className="cadence-heading">
              <div>
                <span className="eyebrow">THE DAILY CADENCE</span>
                <h2 id="cadence-title">A phone line that knows what changed today.</h2>
              </div>
              <p>
                PreShift is both the brand and the simple action: brief your
                digital employee before it represents your business.
              </p>
            </div>
            <div className="cadence-grid">
              {cadence.map(({ number, icon: Icon, title, copy }) => (
                <article className="cadence-step" key={number}>
                  <div className="step-top">
                    <span>{number}</span>
                    <Icon size={21} />
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
            <div className="pilot-strip">
              <CalendarCheck2 size={21} />
              <span>
                <strong>Start with the holidays.</strong> Use the Holiday
                Hotline as a low-stress test before deciding whether PreShift
                belongs in your longer-term daily operations.
              </span>
            </div>
          </section>
        </>
      ) : (
        <Desk />
      )}

      <footer>
        <span>
          preshift <span className="brand-star">✳</span>
        </span>
        <span>Brief your digital employee before the rush.</span>
        <span>HOLIDAY HOTLINE PILOT</span>
      </footer>
    </main>
  );
}
