import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Dumbbell, Apple, Brain, QrCode, Bell,
  Star, Gift, MessagesSquare, BarChart3, ShieldCheck,
  Smartphone, ClipboardList, ArrowUpRight,
} from "lucide-react";

const memberFeatures = [
  { icon: Brain, title: "AI Fitness Coach", body: "Personalized plans, form feedback and adaptive progression that learn from every session." },
  { icon: Dumbbell, title: "Workout Tracking", body: "Log sets, reps, RPE and PRs. Templates, supersets, rest timers — built for serious lifters." },
  { icon: Apple, title: "Nutrition Tracking", body: "Macro targets, meal plans and barcode logging that adapt to your training load." },
  { icon: QrCode, title: "Frictionless Check-In", body: "Walk in, scan, train. No paper sign-ins, no kiosk queues." },
  { icon: Gift, title: "Referrals & Rewards", body: "Invite friends, earn perks and unlock loyalty benefits at your gym." },
  { icon: Star, title: "Reviews & Community", body: "Rate sessions, follow training partners, celebrate PRs together." },
];

const ownerFeatures = [
  { icon: ClipboardList, title: "Members & Plans", body: "One roster, every plan, full payment history — searchable in seconds." },
  { icon: BarChart3, title: "Revenue Visibility", body: "MRR, churn, LTV and attendance trends without exporting a single CSV." },
  { icon: Bell, title: "Retention Engine", body: "Identify at-risk members the week they start fading — not the month they cancel." },
  { icon: MessagesSquare, title: "Member Communication", body: "Chat with members, broadcast announcements, run campaigns." },
  { icon: ShieldCheck, title: "Approval-Gated Access", body: "Every gym owner is manually approved and issued a unique access code." },
  { icon: Smartphone, title: "Branded Member App", body: "Your members get the SE7EN FIT app pre-configured for your gym." },
];

const Index = () => {
  return (
    <Layout>
      {/* HERO */}
      <section className="relative min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] overflow-hidden border-b border-separator">
        <div className="absolute inset-y-0 right-0 w-full md:w-[58%] pointer-events-none">
          <img
            src="/hero-lifter.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center opacity-80 md:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/5" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background" />
        </div>

        <div className="container-wide relative z-10 flex min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex-col pt-12 md:pt-16">
          <div className="w-full">
            <div className="flex items-center gap-3 text-label mb-8 md:mb-10">
              <span className="inline-block w-2 h-2 bg-accent" />
              <span>The fitness app your gym actually uses</span>
            </div>

            <h1 className="max-w-5xl font-display font-bold tracking-[-0.06em] leading-[0.9] text-[clamp(4.5rem,11vw,12rem)]">
              Train.<br />
              Belong.<br />
              <span className="text-accent">Progress.</span>
            </h1>
          </div>

          <div className="relative left-1/2 mt-10 md:mt-12 w-screen -translate-x-1/2 border-t border-separator" />

          <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_310px] items-center gap-8 md:gap-12 py-8 md:py-10 w-full">
            <p className="text-lg md:text-2xl leading-snug text-foreground/85 max-w-3xl">
              SE7EN FIT is a member fitness app and a gym management tool built together —
              so your workouts, attendance, payments and progress all live in one place
              you and your gym both love to open.
            </p>
            <div className="flex flex-col gap-3 md:justify-self-end w-full md:w-[310px]">
              <Link
                to="/gym-management/request-access"
                className="group inline-flex items-center justify-between px-5 py-4 bg-accent text-accent-foreground font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
              >
                Bring SE7EN to your gym
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="group inline-flex items-center justify-between px-5 py-4 border border-separator text-foreground font-medium uppercase tracking-wider text-sm hover:border-foreground transition-colors bg-background/40 backdrop-blur-sm"
              >
                Talk to us
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOR MEMBERS */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <div className="grid md:grid-cols-3 gap-10 md:gap-16 mb-14">
            <div className="md:col-span-1">
              <p className="text-label mb-4">For members</p>
              <h2 className="text-headline">Your training, finally in one place.</h2>
            </div>
            <p className="md:col-span-2 text-lg text-foreground/70 leading-relaxed self-end max-w-2xl">
              Workouts, nutrition, AI coaching, check-ins and progress —
              built around the gym you actually go to, not a generic template downloaded by millions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-separator">
            {memberFeatures.map((f) => (
              <div key={f.title} className="bg-background p-6 md:p-8 group hover:bg-hover-bg transition-colors">
                <f.icon size={22} className="text-accent mb-6" />
                <h3 className="font-display font-semibold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR GYM OWNERS */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <div className="grid md:grid-cols-3 gap-10 md:gap-16 mb-14">
            <div className="md:col-span-1">
              <p className="text-label mb-4">For gym owners</p>
              <h2 className="text-headline">Run the gym, not the admin.</h2>
            </div>
            <p className="md:col-span-2 text-lg text-foreground/70 leading-relaxed self-end max-w-2xl">
              Stop stitching together a spreadsheet, a WhatsApp group and a payment link.
              SE7EN FIT replaces that stack with one operator-grade tool —
              and a member app your people actually want to open.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-separator mb-12">
            {ownerFeatures.map((f) => (
              <div key={f.title} className="bg-background p-6 md:p-8 group hover:bg-hover-bg transition-colors">
                <f.icon size={22} className="text-accent mb-6" />
                <h3 className="font-display font-semibold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>

          <Link
            to="/gym-management/request-access"
            className="inline-flex items-center gap-2 px-5 py-4 bg-foreground text-background font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
          >
            Request gym access <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {/* APPROVAL FLOW */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <p className="text-label mb-6">How gym owners get on board</p>
          <div className="grid md:grid-cols-4 gap-px bg-separator">
            {[
              { n: "01", t: "Request access", b: "Submit your gym details. We review every application by hand." },
              { n: "02", t: "Get approved", b: "Approved gyms receive a single-use code by email." },
              { n: "03", t: "Activate your gym", b: "Use the code to create your owner account and your gym's workspace." },
              { n: "04", t: "Invite members", b: "Members download the app, scan in, and your dashboard comes alive." },
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
