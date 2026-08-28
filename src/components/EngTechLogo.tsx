import { HardHat, ShieldCheck, Siren, Stethoscope, type LucideIcon } from "lucide-react";
import { useAppSettings, type BrandPreset } from "@/lib/useAppSettings";

const PRESET_ICONS: Record<Exclude<BrandPreset, "custom">, LucideIcon> = {
  hardhat: HardHat,
  shield: ShieldCheck,
  siren: Siren,
  stethoscope: Stethoscope,
};

export function EngTechLogo({ size = 44 }: { size?: number }) {
  const { settings } = useAppSettings();
  const preset = (settings?.brand_preset ?? "hardhat") as BrandPreset;
  const customUrl = settings?.app_icon_url;

  if (preset === "custom" && customUrl) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-2xl bg-card shadow-glow"
        style={{ width: size, height: size }}
      >
        <img src={customUrl} alt="Logo" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  const Icon = PRESET_ICONS[preset as Exclude<BrandPreset, "custom">] ?? HardHat;
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow"
      style={{ width: size, height: size }}
    >
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}
