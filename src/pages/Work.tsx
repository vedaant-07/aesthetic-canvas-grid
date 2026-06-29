import { Layout } from "@/components/Layout";
import { ProjectListItem } from "@/components/ProjectListItem";
import { projects } from "@/data/projects";

const Work = () => {
  return (
    <Layout showEchelonFooter>
      {/* Header */}
      <section className="container-wide pt-16 md:pt-24 pb-16 md:pb-20">
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight">
          Projects
        </h1>
      </section>

      {/* Project List */}
      <section className="pb-24">
        {projects.map((project, index) => (
          <ProjectListItem
            key={project.id}
            id={project.id}
            title={project.title}
            tags={project.tags}
            year={project.year}
            image={project.coverImage}
            index={index}
          />
        ))}
      </section>
    </Layout>
  );
};

export default Work;
