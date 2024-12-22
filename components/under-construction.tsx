"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

import { Github, Linkedin } from "./icons";
import posthog from "posthog-js";

const Word = ({
  text,
  onHoveredTextEvent,
}: {
  text: string;
  onHoveredTextEvent: (text: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    onHoveredTextEvent(text);
  }, [text, onHoveredTextEvent]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  if (text === "Soon") {
    return (
      <span
        className="relative inline-block cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.span
          className="relative z-10 inline-block"
          animate={hovered ? { x: 2, y: -2 } : { x: 0, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {text}
        </motion.span>
        <motion.span
          className="absolute left-0 top-0 text-yellow-600 select-none"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={
            hovered ? { opacity: 1, x: -2, y: 2 } : { opacity: 0, x: 0, y: 0 }
          }
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {text}
        </motion.span>
      </span>
    );
  }

  return <span className="px-1">{text}</span>;
};

export function UnderConstruction() {
  const onHoveredTextEvent = (text: string) => {
    posthog.capture("text_hover", { text });
  };

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
        <h1 className="text-4xl font-bold mb-4 animate-fade-in-down text-gray-100">
          James Zhang
        </h1>
        <p className="text-2xl font-bold mb-8 animate-fade-in-up">
          Coming <Word text="Soon" onHoveredTextEvent={onHoveredTextEvent} />{" "}
          ...
        </p>
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
