import { Fragment, type ReactNode } from "react";

const slot = /(\{\w+\})/;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

export function format(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(slot).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    if (name && name in values) return <Fragment key={index}>{values[name]}</Fragment>;
    return part;
  });
}
