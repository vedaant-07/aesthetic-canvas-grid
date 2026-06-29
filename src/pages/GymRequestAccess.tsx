import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Construction } from "lucide-react";

const GymRequestAccess = () => {
  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Request Access</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-8">
          Apply to use SE7EN FIT.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl">
          The application form collects your gym name, owner details, location, member count, gym type,
          current software and your requirements. Every request is reviewed manually and approved gyms
          receive a single-use access code by email.
        </p>

        <div className="mt-12 border border-separator p-8 flex gap-6 items-start bg-hover-bg/40">
          <Construction size={22} className="text-accent shrink-0 mt-1" />
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-xl">Form wiring lands in Stage 3</h2>
            <p className="text-sm text-foreground/65 leading-relaxed">
              The form, validation, edge function and <span className="font-mono text-foreground">gym_owner_requests</span> table
              are scheduled for Stage 3 of this build. Stage 2 (database schema, roles and RLS) comes first.
              No fake submit is wired here on purpose — to keep the system honest.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GymRequestAccess;
