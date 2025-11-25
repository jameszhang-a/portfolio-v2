"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { Github, Linkedin } from "./icons";
import posthog from "posthog-js";

export function UnderConstruction() {
  const onHoveredIconEvent = (icon: string) => {
    posthog.capture("icon_hover", { icon });
  };

  const onClickedIconEvent = (icon: string) => {
    posthog.capture("icon_click", { icon });
  };

  useEffect(() => {
    const stars = document.querySelectorAll(".star");
    stars.forEach((star) => {
      star.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
        duration: 3000,
        easing: "ease-in-out",
        iterations: Infinity,
        delay: Math.random() * 3000,
      });
    });
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-gray-900 text-gray-300">
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="star absolute rounded-full bg-gray-500"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
            }}
          />
        ))}
      </div>
      <main className="z-10 text-center">
        <div className="flex justify-center space-x-6 animate-fade-in-up">
          <motion.a
            href="https://github.com/jameszhang-a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 transition-colors duration-300"
            whileHover={{ scale: 1.2 }}
            onMouseEnter={() => onHoveredIconEvent("github")}
            onClick={() => onClickedIconEvent("github")}
          >
            <Github className="w-8 h-8" />
            <span className="sr-only">GitHub</span>
          </motion.a>
          <motion.a
            href="https://www.linkedin.com/in/jameszhanga/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 transition-colors duration-300"
            whileHover={{ scale: 1.2 }}
            onMouseEnter={() => onHoveredIconEvent("linkedin")}
            onClick={() => onClickedIconEvent("linkedin")}
          >
            <Linkedin className="w-8 h-8" />
            <span className="sr-only">LinkedIn</span>
          </motion.a>
        </div>
      </main>
    </div>
  );
}
