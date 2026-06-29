import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Construction } from "lucide-react";

const GymLogin = () => {
  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Existing Gym Owner Login</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-8">
          Sign in.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl">
          Email and password sign-in for approved gym owners. Sessions are issued by Lovable Cloud Auth,
          with role + gym-scope checks enforced in the database via RLS.
        </p>

        <div className="mt-12 border border-separator p-8 flex gap-6 items-start bg-hover-bg/40">
          <Construction size={22} className="text-accent shrink-0 mt-1" />
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-xl">Login wiring lands in Stage 5</h2>
            <p className="text-sm text-foreground/65 leading-relaxed">
              Auth, the protected gym-owner route guard and the dashboard shell go in together so that login,
              authorization and data scoping all ship at the same time.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GymLogin;
