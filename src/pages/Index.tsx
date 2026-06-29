import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Dumbbell, Apple, Brain, QrCode, CreditCard, Bell,
  Star, Gift, MessagesSquare, BarChart3, ShieldCheck, ArrowUpRight,
} from "lucide-react";

const features = [
  { icon: Brain, title: "AI Fitness Coach", body: "Personalized plans, form feedback, and adaptive progression powered by SE7EN's coaching model." },
  { icon: Dumbbell, title: "Workout Tracking", body: "Log sets, reps, RPE and PRs. Templates, supersets, rest timers — built for serious lifters." },
  { icon: Apple, title: "Nutrition Tracking", body: "Macro targets, meal plans and barcode logging that sync with the member's training load." },
  { icon: QrCode, title: "QR Check-In", body: "Frictionless attendance. Members scan, the gym knows. No paper, no kiosk lock-in." },
  { icon: CreditCard, title: "Payments & Subscriptions", body: "Plans, invoicing, dunning and payouts handled end-to-end for the gym owner." },
  { icon: Bell, title: "Retention Engine", body: "Smart notifications, churn signals and re-engagement campaigns that keep members training." },
  { icon: Star, title: "Reviews & Reputation", body: "Collect reviews, surface social proof, route negative feedback privately to the owner." },
  { icon: Gift, title: "Referrals & Rewards", body: "Members invite friends, earn perks. Built-in loyalty that compounds." },
  { icon: MessagesSquare, title: "Support & Consult", body: "In-app chat between members, trainers and owners — with a full ticketing trail." },
];

const pillars = [
  { kicker: "01 / Member App", title: "Train smarter, every session.", body: "Workouts, nutrition, progress and an AI coach in one app that's actually built around the gym they go to.", to: "/" },
  { kicker: "02 / Gym Management", title: "Run the gym, not the admin.", body: "One tool for members, attendance, payments, retention and staff. Designed with operators, not for them.", to: "/gym-management" },
  { kicker: "03 / Ecosystem", title: "One backend, one source of truth.", body: "Member app, owner tool and admin station all share the same secure backend. No CSV exports. No duplicate logins.", to: "/support" },
];

const Index = () => {
  return (
    <Layout>
      {/* HERO */}
      <section className="container-wide pt-12 md:pt-20 pb-24 md:pb-32">
        <div className="space-y-8 md:space-y-12">
          <div className="flex items-center gap-3 text-label">
            <span className="inline-block w-2 h-2 bg-accent" />
            <span>One connected fitness ecosystem</span>
          </div>

          <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.92] text-[clamp(3rem,11vw,11rem)]">
            Train.<br />
            Operate.<br />
            <span className="text-accent">Scale.</span>
          </h1>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 pt-6 border-t border-separator">
            <p className="md:col-span-2 text-lg md:text-2xl leading-snug text-foreground/85 max-w-3xl">
              SE7EN FIT is the member app, gym management tool and admin station behind serious fitness brands —
              built on a single backend so workouts, attendance, payments and retention finally talk to each other.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/gym-management"
                className="group inline-flex items-center justify-between px-5 py-4 bg-accent text-accent-foreground font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
              >
                Gym Management Tool
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="group inline-flex items-center justify-between px-5 py-4 border border-separator text-foreground font-medium uppercase tracking-wider text-sm hover:border-foreground transition-colors"
              >
                Talk to us
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <p className="text-label mb-10">What SE7EN FIT is</p>
          <div className="grid md:grid-cols-3 gap-px bg-separator">
            {pillars.map((p) => (
              <Link key={p.kicker} to={p.to} className="group bg-background p-8 md:p-10 hover:bg-hover-bg transition-colors flex flex-col gap-6 min-h-[280px]">
                <p className="font-mono text-xs text-muted-foreground tracking-wider">{p.kicker}</p>
                <h3 className="text-headline">{p.title}</h3>
                <p className="text-foreground/70 leading-relaxed mt-auto">{p.body}</p>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                  Explore <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <div className="grid md:grid-cols-3 gap-10 md:gap-16 mb-14">
            <div className="md:col-span-1">
              <p className="text-label mb-4">Capabilities</p>
              <h2 className="text-headline">Everything a modern gym brand needs.</h2>
            </div>
            <p className="md:col-span-2 text-lg text-foreground/70 leading-relaxed self-end max-w-2xl">
              The member app and gym management tool aren't two products bolted together —
              they're two faces of the same backend, designed to make every workout, scan and payment a signal the gym can act on.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-separator">
            {features.map((f) => (
              <div key={f.title} className="bg-background p-6 md:p-8 group hover:bg-hover-bg transition-colors">
                <f.icon size={22} className="text-accent mb-6" />
                <h3 className="font-display font-semibold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY GYM OWNERS */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-20">
          <div>
            <p className="text-label mb-6">For gym owners</p>
            <h2 className="text-headline mb-6">Stop stitching together five tools.</h2>
            <p className="text-lg text-foreground/70 leading-relaxed mb-10">
              Most gyms run on a spreadsheet, a WhatsApp group, a payment link and prayer.
              SE7EN FIT replaces that stack with one operator-grade tool — and a member app your people actually want to open.
            </p>
            <Link
              to="/gym-management/request-access"
              className="inline-flex items-center gap-2 px-5 py-4 bg-foreground text-background font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
            >
              Request gym access <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="space-y-6">
            {[
              { icon: BarChart3, title: "Real revenue visibility", body: "MRR, churn, LTV and attendance trends in one dashboard." },
              { icon: ShieldCheck, title: "Approval-gated access", body: "Every gym owner is manually approved and issued a unique access code before they touch the tool." },
              { icon: Bell, title: "Built-in retention", body: "Identify at-risk members the week they start fading — not the month they cancel." },
            ].map((b) => (
              <div key={b.title} className="flex gap-5 p-6 border border-separator">
                <b.icon size={22} className="text-accent shrink-0 mt-1" />
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">{b.title}</h3>
                  <p className="text-sm text-foreground/65 leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPROVAL FLOW */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <p className="text-label mb-6">How gym owner approval works</p>
          <div className="grid md:grid-cols-4 gap-px bg-separator">
            {[
              { n: "01", t: "Request access", b: "Submit your gym details. We review every application manually." },
              { n: "02", t: "Get approved", b: "Approved gyms receive a single-use unique code by email." },
              { n: "03", t: "Enter your code", b: "Use the code to create your gym owner account and activate your workspace." },
              { n: "04", t: "Run your gym", b: "Your dashboard only ever shows your gym's data. Members get the app, you get the controls." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-8 min-h-[220px] flex flex-col">
                <p className="font-mono text-xs text-accent tracking-wider mb-6">{s.n}</p>
                <h3 className="font-display font-semibold text-xl mb-3">{s.t}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
