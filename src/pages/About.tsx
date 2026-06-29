import { Layout } from "@/components/Layout";

const clients = [
  "Gallery Moderne",
  "Tech Futures Lab",
  "Bloom Publishing",
  "Vogue Italia",
  "Heritage Museum",
];

const About = () => {
  return (
    <Layout showEchelonFooter>
      <section className="container-wide py-16 md:py-24">
        <div className="max-w-3xl space-y-12">
          {/* Content */}
          <div>
            <h1 className="text-display mb-8 animate-fade-in-up">About</h1>
            
            <div className="space-y-6 text-lg md:text-xl leading-relaxed text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <p>
                <span className="text-foreground">Jordan Studio</span> is an independent creative 
                studio specializing in brand identity, illustration, and visual design.
              </p>
              <p>
                Our approach combines minimalist aesthetics, authentic storytelling, 
                and thoughtful design. Each project is an opportunity to explore 
                stories through a unique visual language.
              </p>
              <p>
                We work on commercial, editorial, and personal projects, always 
                seeking to create authentic narratives with visual depth.
              </p>
            </div>
          </div>

          {/* Selected Clients */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-label mb-6">Selected Clients</h2>
            <ul className="space-y-3">
              {clients.map((client) => (
                <li key={client} className="text-lg">
                  {client}
                </li>
              ))}
            </ul>
          </div>

          {/* Experience */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-label mb-6">Expertise</h2>
            <div className="flex flex-wrap gap-3">
              {["Brand Identity", "Illustration", "Editorial", "Visual Design", "Art Direction", "Motion"].map((area) => (
                <span
                  key={area}
                  className="text-sm border border-border px-4 py-2"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
