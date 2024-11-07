"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Github, Linkedin } from "./icons";

const Word = ({ children }: { children: string }) => {
  const [hovered, setHovered] = useState(false);

  if (children === "Soon") {
    return (
      <span
        className="relative inline-block cursor-default"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.span
          className="relative z-10 inline-block"
          animate={hovered ? { x: 2, y: -2 } : { x: 0, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.span>
        <motion.span
          className="absolute left-0 top-0 text-yellow-600 select-none"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={
            hovered ? { opacity: 1, x: -2, y: 2 } : { opacity: 0, x: 0, y: 0 }
          }
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.span>
      </span>
    );
  }

  return <span className="px-1">{children}</span>;
};

export function UnderConstruction() {
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
        <h1 className="text-4xl font-bold mb-4 animate-fade-in-down text-gray-100">
          James Zhang
        </h1>
        <p className="text-2xl font-bold mb-8 animate-fade-in-up">
          Coming <Word>Soon</Word> ...
        </p>
        <div className="flex justify-center space-x-6 animate-fade-in-up">
          <motion.a
            href="https://github.com/jameszhang-a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 transition-colors duration-300"
            whileHover={{ scale: 1.2 }}
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
          >
            <Linkedin className="w-8 h-8" />
            <span className="sr-only">LinkedIn</span>
          </motion.a>
        </div>
      </main>
    </div>
  );
}
