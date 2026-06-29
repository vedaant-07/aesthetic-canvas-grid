import { Layout } from "@/components/Layout";
import { Mail, Instagram, MapPin } from "lucide-react";

const Contact = () => {
  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 min-h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="space-y-12">
            <div>
              <p className="text-label mb-4">Contact</p>
              <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.5rem,7vw,6rem)] mb-6">
                Let's build.
              </h1>
              <p className="text-lg md:text-xl text-foreground/70 max-w-xl leading-relaxed">
                Press, partnerships, gym-owner sales or member feedback — we read every message.
              </p>
            </div>

            <div className="space-y-5">
              <a href="mailto:hello@se7en.fit" className="flex items-center gap-4 text-lg group">
                <Mail size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="hover:text-accent transition-colors">hello@se7en.fit</span>
              </a>
              <a href="https://instagram.com/se7en.fit" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-lg group">
                <Instagram size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="hover:text-accent transition-colors">@se7en.fit</span>
              </a>
              <div className="flex items-center gap-4 text-lg text-muted-foreground">
                <MapPin size={20} />
                <span>Built worldwide. Operated remote-first.</span>
              </div>
            </div>
          </div>

          <div className="border border-separator p-8 md:p-10 bg-hover-bg/30 flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <p className="text-label">For gym owners</p>
              <h2 className="font-display font-semibold text-2xl md:text-3xl leading-tight">
                Looking for the gym management tool?
              </h2>
              <p className="text-foreground/70 leading-relaxed">
                Apply for access, validate your unique code, or sign in to your existing account.
              </p>
            </div>
            <a href="/gym-management" className="mt-8 inline-flex items-center justify-center px-5 py-4 bg-accent text-accent-foreground font-medium uppercase tracking-wider text-sm hover:opacity-90 transition-opacity">
              Go to Gym Portal →
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
