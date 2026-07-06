import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowUpRight, KeyRound, UserPlus, LogIn } from "lucide-react";

const options = [
  {
    icon: UserPlus,
    kicker: "New",
    title: "Sign up & Request Access",
    body: "Create or open your account first, then submit your gym details for manual approval.",
    cta: "Sign up with Google",
    to: "/gym-management/login?next=request-access",
  },
  {
    icon: KeyRound,
    kicker: "Approved",
    title: "Enter Unique Code",
    body: "Already approved? Enter the single-use access code we emailed you to activate your account.",
    cta: "Enter code",
    to: "/gym-management/code",
  },
  {
    icon: LogIn,
    kicker: "Existing",
    title: "Owner Login",
    body: "Already have a SE7EN FIT gym owner account? Sign in with Google or email OTP.",
    cta: "Sign in",
    to: "/gym-management/login",
  },
];

const GymManagement = () => {
  return (
    <Layout>
      <section className="container-wide pt-12 md:pt-20 pb-16">
        <p className="text-label mb-6">Gym Management Tool</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.5rem,7vw,6rem)] max-w-5xl">
          Built for the people who actually run the floor.
        </h1>
        <p className="mt-8 text-lg md:text-xl text-foreground/70 max-w-2xl leading-relaxed">
          Members, attendance, payments, retention, staff — one operator-grade console, gated by verified owner signup and manual approval.
        </p>
      </section>

      <section className="container-wide pb-24 md:pb-32">
        <div className="grid md:grid-cols-3 gap-px bg-separator border border-separator">
          {options.map((o) => (
            <Link
              key={o.to}
              to={o.to}
              className="group bg-background p-8 md:p-10 hover:bg-hover-bg transition-colors flex flex-col gap-6 min-h-[320px]"
            >
              <div className="flex items-center justify-between">
                <o.icon size={22} className="text-accent" />
                <span className="font-mono text-xs text-muted-foreground tracking-wider uppercase">{o.kicker}</span>
              </div>
              <h2 className="font-display font-semibold text-2xl md:text-3xl">{o.title}</h2>
              <p className="text-sm text-foreground/65 leading-relaxed">{o.body}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                {o.cta} <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16 border-t border-separator pt-10 grid md:grid-cols-3 gap-8">
          <div>
            <p className="text-label mb-2">Verified signup</p>
            <p className="text-sm text-foreground/65 leading-relaxed">Owners sign up first, so the request form can use their verified account email.</p>
          </div>
          <div>
            <p className="text-label mb-2">Single-use codes</p>
            <p className="text-sm text-foreground/65 leading-relaxed">Access codes are generated server-side, hashed, expire and can be revoked.</p>
          </div>
          <div>
            <p className="text-label mb-2">Data isolation</p>
            <p className="text-sm text-foreground/65 leading-relaxed">Each dashboard only shows its own gym data. Enforced in the database, not only the UI.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GymManagement;
