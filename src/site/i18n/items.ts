import { translations } from "@/registry/__generated__/items.zh";
import type { RegistryItem } from "@/registry/schema";
import type { Locale } from "@/site/i18n/config";

export function localizeItem(item: RegistryItem, locale: Locale): RegistryItem {
  const translation = locale === "zh" ? translations[item.slug] : undefined;
  if (!translation) return item;
  return {
    ...item,
    name: translation.name || item.name,
    description: translation.description || item.description,
    demos: item.demos.map((demo) => ({ ...demo, title: translation.demos?.[demo.name] || demo.title })),
    props: item.props.map((group) => ({
      ...group,
      props: group.props.map((prop) => ({
        ...prop,
        description: translation.props?.[group.component]?.[prop.name] || prop.description,
      })),
    })),
  };
}

const pinyin = new Intl.Collator("zh-Hans-CN-u-co-pinyin");

export function sortByName<T extends { name: string }>(list: T[], locale: Locale): T[] {
  return locale === "zh" ? [...list].sort((a, b) => pinyin.compare(a.name, b.name)) : list;
}
