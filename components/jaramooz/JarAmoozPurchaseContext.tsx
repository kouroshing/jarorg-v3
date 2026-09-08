"use client";

import React, { createContext, useContext, useState } from "react";
import JarAmoozPurchaseModal from "./JarAmoozPurchaseModal";

export type CoursePurchaseTarget = {
  courseId: string;
  title: string;
  price: number;
  initialPhone?: string;
};

type JarAmoozPurchaseContextType = {
  isOpen: boolean;
  selectedCourse: CoursePurchaseTarget | null;
  openPurchaseModal: (course: CoursePurchaseTarget) => void;
  closePurchaseModal: () => void;
};

const JarAmoozPurchaseContext = createContext<JarAmoozPurchaseContextType | undefined>(undefined);

export function JarAmoozPurchaseProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CoursePurchaseTarget | null>(null);

  const openPurchaseModal = (course: CoursePurchaseTarget) => {
    setSelectedCourse(course);
    setIsOpen(true);
  };

  const closePurchaseModal = () => {
    setIsOpen(false);
  };

  return (
    <JarAmoozPurchaseContext.Provider
      value={{
        isOpen,
        selectedCourse,
        openPurchaseModal,
        closePurchaseModal,
      }}
    >
      {children}
      <JarAmoozPurchaseModal />
    </JarAmoozPurchaseContext.Provider>
  );
}

export function useJarAmoozPurchaseModal() {
  const context = useContext(JarAmoozPurchaseContext);
  if (!context) {
    throw new Error("useJarAmoozPurchaseModal must be used within a JarAmoozPurchaseProvider");
  }
  return context;
}
