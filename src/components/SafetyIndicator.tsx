"use client";

import type { SafetyAssessment } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface SafetyIndicatorProps {
  assessment: SafetyAssessment | null;
}

export default function SafetyIndicator({ assessment }: SafetyIndicatorProps) {
  if (!assessment) {
    return (
       <Alert variant="default" className="shadow-md">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Awaiting Assessment</AlertTitle>
        <AlertDescription>
          Select a location and drone profile to assess flight safety.
        </AlertDescription>
      </Alert>
    );
  }

  const { indicatorColor, message, safeToFly } = assessment;

  let IconComponent;
  let titleText;
  let alertVariant: "default" | "destructive" = "default";
  let bgColorClass = "";
  let textColorClass = "text-foreground";


  switch (indicatorColor) {
    case 'GREEN':
      IconComponent = CheckCircle2;
      titleText = "Safe to Fly";
      bgColorClass = "bg-green-100 border-green-500";
      textColorClass = "text-green-700";
      break;
    case 'ORANGE':
      IconComponent = AlertTriangle;
      titleText = "Caution Advised";
      bgColorClass = "bg-orange-100 border-orange-500";
      textColorClass = "text-orange-700";
      break;
    case 'RED':
      IconComponent = XCircle;
      titleText = "Not Safe to Fly";
      alertVariant = "destructive"; // Using destructive variant for strong visual cue
      bgColorClass = "bg-red-100 border-red-500";
      textColorClass = "text-red-700";
      break;
    default:
      IconComponent = AlertTriangle;
      titleText = "Unknown Status";
  }

  return (
    <Alert variant={alertVariant} className={`shadow-lg ${bgColorClass} ${textColorClass} border-2`}>
      <IconComponent className={`h-6 w-6 ${textColorClass}`} />
      <AlertTitle className={`text-xl font-bold ${textColorClass}`}>{titleText}</AlertTitle>
      <AlertDescription className={`text-base ${textColorClass}`}>
        {message}
      </AlertDescription>
    </Alert>
  );
}
