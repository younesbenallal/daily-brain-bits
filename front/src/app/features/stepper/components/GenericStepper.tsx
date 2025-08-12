"use client"; // Ajoutez cette ligne en haut du fichier

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
} from "@/components/ui/stepper";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const steps = [1, 2, 3, 4];

interface GenericStepperProps {
  listComponents: React.ReactNode[];
  validateButtons: React.ReactNode[];
}

export default function GenericStepper({
  listComponents,
  validateButtons,
}: GenericStepperProps) {
  const [activeStep, setActiveStep] = useState(1);

  const handleNext = () => {
    if (activeStep < steps.length) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  return (
    <div className="border-input has-data-[state=checked]:border-primary/50 relative flex items-start gap-2 rounded-md p-4 shadow-xs outline-none  w-1/2">
      <div className="mx-auto max-w-xl space-y-8 text-center">
        <div className="hidden">
          <Stepper value={activeStep} onValueChange={setActiveStep}>
            {steps.map((step) => (
              <StepperItem key={step} step={step} className="not-last:flex-1">
                <StepperTrigger>
                  <StepperIndicator asChild>{step}</StepperIndicator>
                </StepperTrigger>
                {step < steps.length && <StepperSeparator />}
              </StepperItem>
            ))}
          </Stepper>
        </div>

        <div className="flex flex-col items-center h-full w-full gap-2">
          {listComponents[activeStep - 1]}
        </div>

        <div className="flex gap-4 justify-center">
          {activeStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              Précédent
            </Button>
          )}
          {validateButtons.map((button, index) => {
            return (
              <div key={index} onClick={handleNext}>
                {button}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
