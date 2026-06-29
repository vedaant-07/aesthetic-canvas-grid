import neonPortrait from "@/assets/neon-portrait.jpg";
import lightSilhouette from "@/assets/light-silhouette.jpg";
import tarotCards from "@/assets/tarot-cards.jpg";
import prismaticPortrait from "@/assets/prismatic-portrait.jpg";
import digitalWaves from "@/assets/digital-waves.jpg";
import abstractPaint from "@/assets/abstract-paint.jpg";
import abstractLayers from "@/assets/abstract-layers.jpg";
import fluidArt from "@/assets/fluid-art.jpg";

export interface Project {
  id: string;
  title: string;
  category: string;
  tags: string[];
  year: string;
  client: string;
  description: string;
  coverImage: string;
  images: string[];
}

export const projects: Project[] = [
  {
    id: "neon-glow",
    title: "Neon Glow",
    category: "Photography",
    tags: ["PHOTOGRAPHY", "PORTRAIT"],
    year: "2024",
    client: "Gallery Moderne",
    description: "A striking exploration of light and skin, capturing the ethereal beauty of neon-lit portraiture with cosmic undertones and vibrant color spectrums.",
    coverImage: neonPortrait,
    images: [neonPortrait],
  },
  {
    id: "light-forms",
    title: "Light Forms",
    category: "Digital Art",
    tags: ["DIGITAL", "EXPERIMENTAL"],
    year: "2024",
    client: "Tech Futures Lab",
    description: "Exploring the intersection of human silhouette and abstract light painting. Each piece captures the dynamic tension between body and luminous energy.",
    coverImage: lightSilhouette,
    images: [lightSilhouette],
  },
  {
    id: "mystic-arcana",
    title: "Mystic Arcana",
    category: "Fine Art",
    tags: ["FINE ART", "ILLUSTRATION"],
    year: "2024",
    client: "Digital Arts Foundation",
    description: "A delicate study of Art Nouveau tarot imagery, blending traditional illustration with contemporary botanical arrangements and spiritual symbolism.",
    coverImage: tarotCards,
    images: [tarotCards],
  },
  {
    id: "prismatic-dreams",
    title: "Prismatic Dreams",
    category: "Photography",
    tags: ["PHOTOGRAPHY", "EXPERIMENTAL"],
    year: "2023",
    client: "Bloom Publishing",
    description: "Ethereal portrait series exploring identity through prismatic light distortion, creating otherworldly compositions that blur the line between reality and dream.",
    coverImage: prismaticPortrait,
    images: [prismaticPortrait],
  },
  {
    id: "digital-currents",
    title: "Digital Currents",
    category: "Digital Art",
    tags: ["DIGITAL", "INSTALLATION"],
    year: "2023",
    client: "Neon Collective",
    description: "Immersive digital projections capturing the flow of data and light, where human figures become conduits for streams of vibrant digital energy.",
    coverImage: digitalWaves,
    images: [digitalWaves],
  },
  {
    id: "chromatic-burst",
    title: "Chromatic Burst",
    category: "Fine Art",
    tags: ["FINE ART", "ABSTRACT"],
    year: "2023",
    client: "Independent",
    description: "Bold abstract expressionism exploring raw emotion through vivid color application and dynamic brushwork on textured canvas surfaces.",
    coverImage: abstractPaint,
    images: [abstractPaint],
  },
  {
    id: "layered-depths",
    title: "Layered Depths",
    category: "Fine Art",
    tags: ["FINE ART", "MIXED MEDIA"],
    year: "2022",
    client: "Heritage Museum",
    description: "Complex layered compositions merging digital and traditional techniques, creating depth through overlapping textures and complementary color harmonies.",
    coverImage: abstractLayers,
    images: [abstractLayers],
  },
  {
    id: "fluid-dynamics",
    title: "Fluid Dynamics",
    category: "Fine Art",
    tags: ["FINE ART", "EXPERIMENTAL"],
    year: "2022",
    client: "Art Basel",
    description: "Mesmerizing fluid art exploring the organic flow of pigments, capturing moments of chaos and harmony in vibrant turquoise and magenta compositions.",
    coverImage: fluidArt,
    images: [fluidArt],
  },
];
