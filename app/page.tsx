"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Headphones,
  MapPin,
  MessageCircleMore,
  Phone,
  UserRoundCheck,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import Desk from "./desk";

export default function Home() {
  const [tab, setTab] = useState<"hotline" | "desk">("hotline");
  const hotline = useQuery(api.stores.publicHotline);
  return (
    <main>
      <header className="header">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Phone size={22} />
          </span>
          holiday<span className="brand-light">hotline</span>
          <span className="brand-star">✳</span>
        </Link>
        <nav aria-label="Main navigation">
          <button
            className={tab === "hotline" ? "selected" : ""}
            onClick={() => setTab("hotline")}
          >
            The hotline
          </button>
          <button
            className={tab === "desk" ? "selected" : ""}
            onClick={() => setTab("desk")}
          >
            Manager desk <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <div className="season">
        <span>LOCAL PLACES. USEFUL RIGHT NOW.</span>
        <span>THANKSGIVING — NEW YEAR’S DAY</span>
      </div>
      {tab === "hotline" ? (
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-rule" />
              LOCAL OPERATIONS · HOLIDAY SEASON
            </div>
            <h1>
              What’s different
              <br />
              <em>today?</em> A helpful answer.
            </h1>
            <p className="intro">
              Holiday Helper has a natural first conversation, using the live
              details your team approved today. When someone needs a person, it
              brings one in.
            </p>
            <div className="chips">
              <span>
                <CalendarClock size={16} /> Today’s changes
              </span>
              <span>
                <MessageCircleMore size={16} /> Helpful first answer
              </span>
              <span>
                <UserRoundCheck size={16} /> A person when needed
              </span>
            </div>
            <div className="local-note">
              <MapPin size={18} />
              <span>
                For independent stores, restaurants, clubs, and community
                places.
              </span>
            </div>
          </div>
          <div className="hotline-card">
            <div className="card-top">
              <span>YOUR LIVE INFORMATION HELPER</span>
              <Headphones size={22} />
            </div>
            <div className="helper-mark">
              <Phone size={36} />
            </div>
            <h2>Holiday Helper!</h2>
            <p>
              One quick call. A helpful conversation.
              <br />
              One less interruption for your team.
            </p>
            <div className="number-area">
              <span className="pill">
                {hotline?.hotline
                  ? "YOUR HOLIDAY HELPER LINE"
                  : "DEMO EXPERIENCE"}
              </span>
              <strong>{hotline?.hotline ?? "Holiday Helper demo"}</strong>
              <span>
                {hotline?.hotline
                  ? hotline.name
                  : "Manager-approved answers. A real person when needed."}
              </span>
            </div>
            {hotline?.hotline ? (
              <a className="primary" href={`tel:${hotline.hotline}`}>
                <Phone size={18} />
                Call Holiday Helper
              </a>
            ) : (
              <button className="primary" onClick={() => setTab("desk")}>
                Explore the manager desk <ArrowRight size={18} />
              </button>
            )}
            <div className="card-foot">
              Your team keeps one simple brief current. Reception handles the
              conversation.
            </div>
          </div>
        </section>
      ) : (
        <Desk />
      )}
      <footer>
        <span>
          holiday hotline <span className="brand-star">✳</span>
        </span>
        <span>Today’s truth. A more helpful call.</span>
        <span>BY SHOPFORCE</span>
      </footer>
    </main>
  );
}
