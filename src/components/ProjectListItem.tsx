import { useState } from "react";
import { Link } from "react-router-dom";

interface ProjectListItemProps {
  id: string;
  title: string;
  tags: string[];
  year: string;
  image: string;
  index: number;
}

export function ProjectListItem({ 
  id, 
  title, 
  tags, 
  year, 
  image,
}: ProjectListItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/work/${id}`}
      className={`group block border-b border-separator transition-colors duration-300 ${
        isHovered ? 'bg-accent' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container-wide py-5 md:py-6">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <h3 className={`flex-1 text-lg md:text-xl lg:text-2xl font-sans uppercase tracking-wide transition-colors duration-300 ${
            isHovered ? 'text-accent-foreground' : 'text-foreground'
          }`}>
            {title}
          </h3>

          {/* Tags */}
          <div className="hidden sm:flex items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] md:text-xs uppercase tracking-widest px-3 py-1 border transition-colors duration-300 ${
                  isHovered 
                    ? 'border-accent-foreground text-accent-foreground' 
                    : 'border-separator text-muted-foreground'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Year */}
          <span className={`text-xs md:text-sm uppercase tracking-widest transition-colors duration-300 ${
            isHovered ? 'text-accent-foreground' : 'text-muted-foreground'
          }`}>
            {year}
          </span>

          {/* Hover Image */}
          <div 
            className={`fixed right-8 lg:right-32 top-1/2 -translate-y-1/2 w-64 lg:w-80 aspect-[3/4] pointer-events-none z-40 transition-all duration-300 ${
              isHovered 
                ? "opacity-100 translate-x-0" 
                : "opacity-0 translate-x-4"
            }`}
          >
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
