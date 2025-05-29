"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DEFAULT_DRONE_PROFILES, DRONE_MODELS } from "@/lib/constants";
import type { DroneProfile } from "@/types";
import { Rocket } from "lucide-react";

interface DroneProfileSelectorProps {
  selectedModel: string;
  onModelChange: (modelName: string) => void;
}

const availableModels = [...DEFAULT_DRONE_PROFILES.map(p => p.name), DRONE_MODELS.CUSTOM];

export default function DroneProfileSelector({ selectedModel, onModelChange }: DroneProfileSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="droneModel" className="flex items-center gap-2 text-base font-semibold">
        <Rocket className="text-primary" />
        Select Drone Profile
      </Label>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger id="droneModel" className="w-full text-base">
          <SelectValue placeholder="Select drone model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model} value={model} className="text-base">
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
