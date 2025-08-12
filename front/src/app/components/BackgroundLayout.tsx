import React from "react";
import Image from "next/image";
import fondSvg from "../../../public/fond.svg";

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children }) => {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Image de fond */}
      <Image src={fondSvg} alt="fond" className="object-cover" fill priority />

      {/* Contenu par-dessus l'image */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};

export default BackgroundLayout;
