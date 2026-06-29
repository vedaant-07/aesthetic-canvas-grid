import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Construction } from "lucide-react";

const GymCode = () => {
  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Enter Unique Code</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-8">
          Activate your gym.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl">
          Enter the single-use access code we emailed you after approval. The code is validated server-side
          against a hashed value, with expiry, usage limits and account/gym suspension checks.
        </p>

        <div className="mt-12 border border-separator p-8 flex gap-6 items-start bg-hover-bg/40">
          <Construction size={22} className="text-accent shrink-0 mt-1" />
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-xl">Code validation lands in Stage 5</h2>
            <p className="text-sm text-foreground/65 leading-relaxed">
              The <span className="font-mono text-foreground">unique_access_codes</span> table, the validation edge function
              and the signup-with-code flow are scheduled for Stage 5. We don't ship a frontend-only validator —
              that would be exactly the kind of fake security the spec explicitly forbids.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GymCode;
