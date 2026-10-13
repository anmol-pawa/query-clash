import { Inter, JetBrains_Mono, Tiny5 } from "next/font/google";

/** The pixel display font (OFL): titles, menus, HP boxes and battle text. */
export const pixel = Tiny5({ subsets: ["latin"], weight: "400", variable: "--font-pixel" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

/** Resolved family name, for canvas text in the PixiJS stage. */
export const pixelFamily = pixel.style.fontFamily;
