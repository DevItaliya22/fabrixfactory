"use client";

import { useCallback } from "react";
import { HexAlphaColorPicker } from "react-colorful";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#D0021B",
  "#F5A623",
  "#F8E71C",
  "#8B572A",
  "#7ED321",
  "#417505",
  "#9013FE",
  "#4A90E2",
  "#50E3C2",
  "#B8E986",
  "#000000",
  "#4A4A4A",
  "#9B9B9B",
  "#FFFFFF",
];

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

type RgbaColor = { r: number; g: number; b: number; a: number };

function hexToRgba(hex: string): RgbaColor {
  const normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b, a: 1 };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: 1,
    };
  }
  if (normalized.length === 8) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: parseInt(normalized.slice(6, 8), 16) / 255,
    };
  }
  return { r: 204, g: 204, b: 204, a: 1 };
}

function rgbaToHex({ r, g, b, a }: RgbaColor): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  const rgb = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  if (a >= 1) return rgb;
  return `${rgb}${toHex(a * 255)}`;
}

function parseChannel(value: string, max: number): number | null {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0 || n > max) return null;
  return n;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const color = value || "#CCCCCC";
  const rgba = hexToRgba(color);

  const emitRgba = useCallback(
    (next: RgbaColor) => {
      onChange(rgbaToHex(next));
    },
    [onChange],
  );

  const hexDisplay = rgbaToHex(rgba).replace("#", "").slice(0, 6);
  const alphaPercent = Math.round(rgba.a * 100);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="color-picker-root">
        <HexAlphaColorPicker
          color={color}
          onChange={onChange}
          className="!w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          className="size-8 shrink-0 rounded border"
          style={{ backgroundColor: color }}
        />
        <div className="grid flex-1 grid-cols-5 gap-2">
          <div className="space-y-1">
            <Input
              value={hexDisplay}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/[^0-9A-Fa-f]/g, "")
                  .slice(0, 6);
                if (raw.length === 6) {
                  onChange(`#${raw.toUpperCase()}`);
                }
              }}
              className="h-8 px-2 text-center text-xs uppercase"
            />
            <Label className="text-muted-foreground block text-center text-[10px]">
              Hex
            </Label>
          </div>
          {(["r", "g", "b"] as const).map((channel) => (
            <div key={channel} className="space-y-1">
              <Input
                value={Math.round(rgba[channel])}
                onChange={(e) => {
                  const parsed = parseChannel(e.target.value, 255);
                  if (parsed != null) emitRgba({ ...rgba, [channel]: parsed });
                }}
                className="h-8 px-2 text-center text-xs"
                inputMode="numeric"
              />
              <Label className="text-muted-foreground block text-center text-[10px] uppercase">
                {channel}
              </Label>
            </div>
          ))}
          <div className="space-y-1">
            <Input
              value={alphaPercent}
              onChange={(e) => {
                const parsed = parseChannel(e.target.value, 100);
                if (parsed != null) emitRgba({ ...rgba, a: parsed / 100 });
              }}
              className="h-8 px-2 text-center text-xs"
              inputMode="numeric"
            />
            <Label className="text-muted-foreground block text-center text-[10px]">
              A
            </Label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={cn(
              "size-5 rounded-sm border ring-offset-2 hover:ring-2 hover:ring-ring",
              preset === "#FFFFFF" && "border-border",
            )}
            style={{ backgroundColor: preset }}
            onClick={() => onChange(preset)}
            aria-label={`Pick ${preset}`}
          />
        ))}
      </div>
    </div>
  );
}
