import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { projects } from "@/data/projects";

const Project = () => {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return <Navigate to="/work" replace />;
  }

  return (
    <Layout noPadding headerRevealMode showEchelonFooter>
      {/* Hero - Full Screen */}
      <section className="relative h-screen overflow-hidden">
        <img
          src={project.coverImage}
          alt={project.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/50" />
        
        {/* Centered Title */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight text-foreground text-center px-4 animate-fade-in">
            {project.title}
          </h1>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-8 left-0 right-0 z-10 container-wide">
          <div className="flex justify-between items-end">
            {/* Date */}
            <div className="text-label">
              {project.year}
            </div>

            {/* Tags */}
            <div className="flex gap-3">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] md:text-xs uppercase tracking-widest px-3 py-1 border border-foreground/30 text-foreground/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Project Info */}
      <section className="container-wide py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
          {/* Details */}
          <div className="space-y-8">
            <div>
              <p className="text-label mb-2">Client</p>
              <p>{project.client}</p>
            </div>
            <div>
              <p className="text-label mb-2">Year</p>
              <p>{project.year}</p>
            </div>
            <div>
              <p className="text-label mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm border border-separator px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="container-wide pb-24">
        <div className="space-y-8 md:space-y-12">
          {project.images.map((image, index) => (
            <div
              key={index}
              className="image-reveal animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={image}
                alt={`${project.title} - ${index + 1}`}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Back Link */}
      <section className="container-wide pb-24">
        <Link
          to="/work"
          className="inline-flex items-center gap-3 text-muted-foreground hover-highlight group"
        >
          <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to projects</span>
        </Link>
      </section>
    </Layout>
  );
};

export default Project;
