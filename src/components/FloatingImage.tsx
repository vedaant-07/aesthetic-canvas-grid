interface FloatingImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FloatingImage({ src, alt, className = "", style }: FloatingImageProps) {
  return (
    <div 
      className={`absolute overflow-hidden ${className}`}
      style={style}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
      />
    </div>
  );
}
