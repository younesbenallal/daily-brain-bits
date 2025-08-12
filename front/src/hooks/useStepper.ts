import { useState, useEffect } from "react";

export const useStepper = (initialStep = 0, maxSteps: number) => {
  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize with saved step from localStorage if available
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem("stepperCurrentStep");
      if (savedStep) {
        const stepNumber = parseInt(savedStep, 10);
        if (stepNumber >= 0 && stepNumber < maxSteps) {
          return stepNumber;
        }
      }
    }
    return initialStep;
  });

  useEffect(() => {
    const savedStep = localStorage.getItem("stepperCurrentStep");
    if (savedStep) {
      const stepNumber = parseInt(savedStep, 10);
      if (stepNumber >= 0 && stepNumber < maxSteps) {
        setCurrentStep(stepNumber);
      }
    }
  }, [maxSteps]);

  useEffect(() => {
    console.log("currentStep", currentStep);
    // Only save to localStorage if we're not in the initial render
    if (typeof window !== "undefined") {
      localStorage.setItem("stepperCurrentStep", currentStep.toString());
    }
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < maxSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const resetStepper = () => {
    localStorage.removeItem("stepperCurrentStep");
    setCurrentStep(0);
  };

  return {
    currentStep,
    setCurrentStep,
    nextStep,
    resetStepper,
  };
};
