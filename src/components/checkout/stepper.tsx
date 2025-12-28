import { CheckCircle2 } from "lucide-react";

import type { CheckoutStep } from "~/store/slices/checkout.slice";
import { cn } from "~/lib/utils";

export type StepItem = {
  id: CheckoutStep;
  title: string;
  description?: string;
};

interface StepperProps {
  steps: StepItem[];
  currentStep: CheckoutStep;
}

export function CheckoutStepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="grid gap-4 md:grid-cols-4">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            className={cn(
              "relative flex flex-col rounded-lg border p-4 transition",
              isActive && "border-primary/60 bg-primary/5 shadow-sm",
              isCompleted && "border-emerald-500/50 bg-emerald-50",
            )}
          >
            {!isLast ? (
              <span className="-translate-y-1/2 absolute top-1/2 right-[-12px] hidden h-px w-6 bg-border md:block" />
            ) : null}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border font-semibold text-sm",
                  isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                  isActive && !isCompleted && "border-primary text-primary",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-base">{step.id}</span>
                )}
              </span>
              <div>
                <p className="font-semibold text-sm">
                  Paso {step.id}: {step.title}
                </p>
                {step.description ? (
                  <p className="text-muted-foreground text-xs">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
