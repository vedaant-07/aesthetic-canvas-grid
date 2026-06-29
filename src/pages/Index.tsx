import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { projects } from "@/data/projects";

const Index = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Get 8 unique cover images from projects for the grid (4x2)
  const gridImages = projects.slice(0, 8).map(p => p.coverImage);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate offset from center (normalized to -1 to 1)
    const x = (e.clientX - rect.left - centerX) / centerX;
    const y = (e.clientY - rect.top - centerY) / centerY;
    
    setMousePosition({ x, y });
  };

  return (
    <Layout hideFooter noPadding>
      <section 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative h-screen overflow-hidden"
      >
        {/* Image Grid Background with Parallax - 4 columns x 2 rows */}
        <div 
          className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
          style={{
            transform: `translate(${-mousePosition.x * 40}px, ${-mousePosition.y * 40}px)`,
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 p-12 md:p-16 w-full max-w-7xl">
            {gridImages.map((image, index) => (
              <div 
                key={index}
                className="aspect-[3/4] overflow-hidden"
              >
                <img
                  src={image}
                  alt=""
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-background/30" />

        {/* Centered Title - Overlaid */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight text-foreground">
            Jordan Studio
          </h1>
        </div>

        {/* Bio - Bottom Left */}
        <div className="absolute bottom-8 md:bottom-12 left-6 md:left-12 z-10 max-w-xs md:max-w-sm">
          <p className="text-sm md:text-base font-sans text-foreground/80 leading-relaxed">
            Hi! I'm Jordan, an independent artist and designer specializing in brand identity, illustration, and visual design. I help brands tell their stories through thoughtful, distinctive creative work.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
