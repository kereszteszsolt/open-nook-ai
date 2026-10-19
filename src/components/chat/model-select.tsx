// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import * as Select from "@radix-ui/react-select";

type Model = { id: string; label: string };

function Chevron({ up = false }: { up?: boolean }) {
  return <svg className="model-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={up ? "m5 12 5-5 5 5" : "m5 8 5 5 5-5"}/></svg>;
}

export function ModelSelect({ models, value, disabled, onValueChange }: {
  models: Model[]; value: string; disabled: boolean; onValueChange: (value: string) => void;
}) {
  const selected = models.find((model) => model.id === value);
  return <div className="model-selector">
    <label id="chat-model-label" htmlFor="chat-model">Model</label>
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger id="chat-model" className="model-trigger" aria-labelledby="chat-model-label" title={selected?.label}>
        <Select.Value placeholder="No models configured">{selected?.label}</Select.Value>
        <Select.Icon className="model-icon"><Chevron /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="model-menu" position="popper" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
          <Select.ScrollUpButton className="model-menu-scroll"><Chevron up /></Select.ScrollUpButton>
          <Select.Viewport className="model-options">
            {models.map((model) => <Select.Item className="model-option" key={model.id} value={model.id} textValue={model.label}>
              <Select.ItemText>{model.label}</Select.ItemText>
              <Select.ItemIndicator className="model-check">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>
              </Select.ItemIndicator>
            </Select.Item>)}
          </Select.Viewport>
          <Select.ScrollDownButton className="model-menu-scroll"><Chevron /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>;
}
