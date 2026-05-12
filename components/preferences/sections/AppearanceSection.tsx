"use client";

import type { JSX } from "react";

import { Card, CardHeader } from "../ui/Card";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Segmented } from "../ui/Segmented";
import { ThemeSwatch, ThemeSwatchLocked } from "../ui/ThemeSwatch";
import { Toggle } from "../ui/Toggle";
import type { PreferencesState, SectionProps } from "../types";

type Density = PreferencesState["density"];
type TimeFormat = PreferencesState["timeFormat"];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

const TIME_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
];

export function AppearanceSection({ prefs, update }: SectionProps): JSX.Element {
  return (
    <Section
      title="Appearance"
      desc="Look, density, and typography. Light mode is intentionally not offered."
    >
      <Card>
        <CardHeader
          title="Theme"
          desc="Slate dark is the only supported theme — color contrast on AI panels is tuned for it."
        />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-3">
            <ThemeSwatch selected name="Slate" sample={["#020617", "#0f172a", "#7dd3fc"]} />
            <ThemeSwatchLocked name="Light" sample={["#f8fafc", "#e2e8f0", "#0ea5e9"]} />
            <ThemeSwatchLocked name="System" sample={["#0f172a", "#475569", "#38bdf8"]} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Density" desc="Affects row height in the thread list." />
        <div className="px-5 pb-5">
          <Segmented
            value={prefs.density}
            onChange={(v) => update({ density: v })}
            options={DENSITY_OPTIONS}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Format" />
        <Row
          title="Time format"
          control={
            <Segmented
              size="sm"
              value={prefs.timeFormat}
              onChange={(v) => update({ timeFormat: v })}
              options={TIME_OPTIONS}
            />
          }
        />
        <Row
          title="Show participant avatars"
          control={
            <Toggle
              value={prefs.showAvatars}
              onChange={(v) => update({ showAvatars: v })}
            />
          }
        />
        <Row
          title="Show snippets in list"
          control={
            <Toggle
              value={prefs.showSnippets}
              onChange={(v) => update({ showSnippets: v })}
            />
          }
          last
        />
      </Card>
    </Section>
  );
}
