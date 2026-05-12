"use client";

import { Fragment, type JSX } from "react";

import { Card, CardHeader } from "../ui/Card";
import { Section } from "../ui/Section";

interface ShortcutGroup {
  group: string;
  items: [string, string][];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    group: "Navigation",
    items: [
      ["j", "Next thread"],
      ["k", "Previous thread"],
      ["g i", "Go to Inbox"],
      ["g s", "Go to Sent"],
      ["/", "Focus search"],
      ["Esc", "Clear / close"],
    ],
  },
  {
    group: "Actions",
    items: [
      ["r", "Reply"],
      ["a", "Reply all"],
      ["f", "Forward"],
      ["c", "Compose new"],
      ["e", "Archive"],
      ["#", "Trash"],
      ["Cmd ↵", "Send"],
    ],
  },
  {
    group: "Copilot",
    items: [
      ["Cmd .", "Summarize current thread"],
      ["Cmd Shift D", "Draft a reply"],
      ["Cmd Shift R", "Revise current draft"],
      ["Cmd ↩", "Insert draft into reply"],
    ],
  },
];

export function KeyboardSection(): JSX.Element {
  return (
    <Section
      title="Keyboard shortcuts"
      desc="Every action in Copilot has a shortcut. Defaults shown below — remapping is coming."
    >
      {SHORTCUTS.map((g) => (
        <Card key={g.group}>
          <CardHeader title={g.group} />
          <div className="px-5 pb-4">
            <table className="w-full text-[12.5px]">
              <tbody>
                {g.items.map(([key, label]) => (
                  <tr key={key} className="border-b border-slate-800/60 last:border-b-0">
                    <td className="py-2.5 text-slate-300">{label}</td>
                    <td className="py-2.5 text-right">
                      {key.split(" ").map((part, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span className="text-slate-600 mx-1">then</span>}
                          <kbd>{part}</kbd>
                        </Fragment>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </Section>
  );
}
