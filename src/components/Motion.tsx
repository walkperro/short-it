"use client";

import { motion } from "framer-motion";

export const FadeIn = ({ children, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.35,
      ease: "easeOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

export const FadeInUp = ({ children, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.4,
      ease: "easeOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

export const HoverLift = ({ children }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ type: "spring", stiffness: 300, damping: 22 }}
  >
    {children}
  </motion.div>
);
