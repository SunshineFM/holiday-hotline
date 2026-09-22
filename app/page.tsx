"use client";
import Link from "next/link";
import { useState } from "react";
import Desk from "./desk";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  Phone,
  ArrowUpRight,
  ShoppingBag,
  Gift,
  Clock3,
  MapPin,
  Headphones,
  ArrowRight,
} from "lucide-react";
export default function Home() {
  const [tab, setTab] = useState("hotline");
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
            Associate desk <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <div className="season">
        <span>LOCAL SHOPS. A LITTLE EXTRA HELP.</span>
        <span>THANKSGIVING — NEW YEAR’S DAY</span>
      </div>
      {tab === "hotline" ? (
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-rule" />
              EL PASEO · HOLIDAY SHOPPING
            </div>
            <h1>
              A little help.
              <br />A little more <em>holiday.</em>
            </h1>
            <p className="intro">
              Shopping questions? Call Holiday Helper. It handles the first
              question and brings in someone at the store when you need a
              closer look.
            </p>
            <div className="chips">
              <span>
                <Clock3 size={16} />
                Holiday hours
              </span>
              <span>
                <Gift size={16} />
                Gift wrapping
              </span>
              <span>
                <ShoppingBag size={16} />
                Item checks
              </span>
            </div>
            <div className="local-note">
              <MapPin size={18} />
              <span>Made for local shops. And the people who love them.</span>
            </div>
          </div>
          <div className="hotline-card">
            <div className="card-top">
              <span>YOUR HOLIDAY SHOPPING HELPER</span>
              <Headphones size={22} />
            </div>
            <div className="helper-mark">
              <Phone size={36} />
            </div>
            <h2>Holiday Helper!</h2>
            <p>
              One quick call. A helpful conversation.
              <br />
              One less thing on your list.
            </p>
            <div className="number-area">
              <span className="pill">
                {hotline?.hotline ? "YOUR HOLIDAY HOTLINE" : "DEMO EXPERIENCE"}
              </span>
              <strong>
                {hotline?.hotline ?? "Holiday Helper demo"}
              </strong>
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
                Explore the associate desk <ArrowRight size={18} />
              </button>
            )}
            <div className="card-foot">
              Holiday Helper handles the first question. A real associate is
              close by when needed.
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
        <span>A little more presence. A little less phone tag.</span>
        <span>BY SHOPFORCE</span>
      </footer>
    </main>
  );
}
