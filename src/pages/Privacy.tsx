import { Layout } from "@/components/Layout";

const Privacy = () => (
  <Layout>
    <section className="container-wide py-16 md:py-24 max-w-3xl">
      <p className="text-label mb-4">Legal</p>
      <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.5rem,6vw,5rem)] mb-10">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-foreground/75 leading-relaxed">
        <p>This is the SE7EN FIT privacy policy placeholder. The final policy will describe what data we collect from members, trainers and gym owners, how it is stored in our backend, who has access to it, the role-based access controls that protect it, and the rights you have over your data.</p>
        <h2 className="font-display text-2xl font-semibold text-foreground pt-4">Data we store</h2>
        <p>Account details, training logs, attendance, payment records and support communications. Gym owners only see data scoped to their own gym. Admins only see data necessary to operate the platform.</p>
        <h2 className="font-display text-2xl font-semibold text-foreground pt-4">Your rights</h2>
        <p>You can request export or deletion of your data at any time by writing to <a href="mailto:privacy@se7en.fit" className="text-accent hover:underline">privacy@se7en.fit</a>.</p>
        <p className="text-sm text-muted-foreground pt-8">Last updated: placeholder. Final legal copy to be authored before public launch.</p>
      </div>
    </section>
  </Layout>
);

export default Privacy;
