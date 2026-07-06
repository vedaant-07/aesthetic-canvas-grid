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
        <div className="absolute inset-y-0 right-0 w-full translate-x-10 md:w-[54%] md:translate-x-20 lg:translate-x-28 pointer-events-none">
          <img
            src="/hero-lifter.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-[65%_center] opacity-95 md:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/45" />
        </div>

        <div className="container-wide relative z-10 flex min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] flex-col pt-12 md:pt-16">
          <div className="w-full">
            <div className="flex items-center gap-3 text-label mb-8 md:mb-10">
              <span className="inline-block w-2 h-2 bg-accent" />
              <span>One app for members. One portal for gym owners.</span>
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
              Users download the SE7EN FIT app. Gym owners sign in, request access with a verified email,
              receive approval, and activate their dashboard.
            </p>
            <div className="flex flex-col gap-3 md:justify-self-end w-full md:w-[310px]">
              <a
                href="#download-app"
                className="group inline-flex items-center justify-between px-5 py-4 bg-accent text-accent-foreground font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
              >
                Download app
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <Link
                to="/gym-management/login?next=request-access"
                className="group inline-flex items-center justify-between px-5 py-4 border border-separator text-foreground font-medium uppercase tracking-wider text-sm hover:border-foreground transition-colors bg-background/40 backdrop-blur-sm"
              >
                Gym owner portal
                <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOR MEMBERS */}
      <section id="download-app" className="border-t border-separator scroll-mt-24">
        <div className="container-wide py-20 md:py-28">
          <div className="grid md:grid-cols-3 gap-10 md:gap-16 mb-10">
            <div className="md:col-span-1">
              <p className="text-label mb-4">For users / members</p>
              <h2 className="text-headline">Download the fitness app.</h2>
            </div>
            <p className="md:col-span-2 text-lg text-foreground/70 leading-relaxed self-end max-w-2xl">
              Workouts, nutrition, AI coaching, check-ins and progress —
              built around the gym you actually go to. Store links are placeholders for now and will be connected later.
            </p>
          </div>

          <div className="mb-14 grid gap-3 sm:grid-cols-2 max-w-2xl">
            <button disabled className="flex items-center justify-between border border-separator bg-hover-bg/30 px-5 py-4 text-left opacity-80">
              <span>
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">Coming soon on</span>
                <span className="font-display text-2xl font-semibold">Play Store</span>
              </span>
              <Smartphone size={22} className="text-accent" />
            </button>
            <button disabled className="flex items-center justify-between border border-separator bg-hover-bg/30 px-5 py-4 text-left opacity-80">
              <span>
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">Coming soon on</span>
                <span className="font-display text-2xl font-semibold">App Store</span>
              </span>
              <Apple size={22} className="text-accent" />
            </button>
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
              Owners sign in first, request access with a verified email, receive a unique code after approval,
              and activate the dashboard in the same session.
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/gym-management/login?next=request-access"
              className="inline-flex items-center gap-2 px-5 py-4 bg-foreground text-background font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
            >
              Owner sign up <ArrowUpRight size={16} />
            </Link>
            <Link
              to="/gym-management/login"
              className="inline-flex items-center gap-2 px-5 py-4 border border-separator font-medium uppercase tracking-wider text-sm hover:bg-hover-bg transition-colors"
            >
              Owner sign in <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* APPROVAL FLOW */}
      <section className="border-t border-separator">
        <div className="container-wide py-20 md:py-28">
          <p className="text-label mb-6">Secure owner onboarding flow</p>
          <div className="grid md:grid-cols-5 gap-px bg-separator">
            {[
              { n: "01", t: "Sign in", b: "Owner starts with Google or email code so the request uses a verified email." },
              { n: "02", t: "Request access", b: "The form auto-fills the signed-in email and collects gym details." },
              { n: "03", t: "Admin approval", b: "Admin reviews the request and emails a single-use access code." },
              { n: "04", t: "Enter code", b: "Owner opens the email link, enters the code, and the backend validates it." },
              { n: "05", t: "Dashboard opens", b: "If the owner is still signed in, activation completes and the dashboard opens." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-8 min-h-[240px] flex flex-col">
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
