import { Layout } from "@/components/Layout";
import { LifeBuoy, BookOpen, MessagesSquare } from "lucide-react";

const Support = () => {
  return (
    <Layout>
      <section className="container-wide py-16 md:py-24">
        <p className="text-label mb-4">Support</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.5rem,7vw,6rem)] max-w-4xl mb-8">
          We answer fast.
        </h1>
        <p className="text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl">
          Whether you're a member, a trainer or a gym owner, the SE7EN FIT team is one message away.
        </p>

        <div className="grid md:grid-cols-3 gap-px bg-separator border border-separator mt-16">
          {[
            { icon: MessagesSquare, t: "Email support", b: "Write to support@se7en.fit and a human will reply within one business day.", a: "support@se7en.fit", href: "mailto:support@se7en.fit" },
            { icon: BookOpen, t: "Documentation", b: "Guides for members, trainers and gym owners. Coming with Stage 7.", a: "Coming soon", href: "#" },
            { icon: LifeBuoy, t: "Gym owner help", b: "Approved gym owners get a private support channel inside the management tool.", a: "Inside the tool", href: "/gym-management" },
          ].map((c) => (
            <a key={c.t} href={c.href} className="bg-background p-8 hover:bg-hover-bg transition-colors flex flex-col gap-4 min-h-[240px]">
              <c.icon size={22} className="text-accent" />
              <h3 className="font-display font-semibold text-xl">{c.t}</h3>
              <p className="text-sm text-foreground/65 leading-relaxed">{c.b}</p>
              <span className="mt-auto text-xs uppercase tracking-widest text-accent">{c.a} →</span>
            </a>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Support;
