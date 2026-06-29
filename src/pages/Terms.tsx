import { Layout } from "@/components/Layout";

const Terms = () => (
  <Layout>
    <section className="container-wide py-16 md:py-24 max-w-3xl">
      <p className="text-label mb-4">Legal</p>
      <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.5rem,6vw,5rem)] mb-10">Terms of Service</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-foreground/75 leading-relaxed">
        <p>This is the SE7EN FIT terms of service placeholder. The final terms will cover acceptable use of the member app, the gym management tool, billing and refunds for gym owner subscriptions, content ownership, liability and termination.</p>
        <h2 className="font-display text-2xl font-semibold text-foreground pt-4">Gym owner access</h2>
        <p>Access to the gym management tool is granted only after manual approval of a request and validation of a single-use unique code. Access can be suspended for breach of these terms.</p>
        <h2 className="font-display text-2xl font-semibold text-foreground pt-4">Member accounts</h2>
        <p>Members are responsible for their account credentials and any activity that occurs under their account.</p>
        <p className="text-sm text-muted-foreground pt-8">Last updated: placeholder. Final legal copy to be authored before public launch.</p>
      </div>
    </section>
  </Layout>
);

export default Terms;
