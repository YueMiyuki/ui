import { Heading } from "fumadocs-ui/components/heading";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { type TypeNode, TypeTable } from "fumadocs-ui/components/type-table";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentPropsDoc, RegistryItem } from "@/registry/schema";
import { DemoBlock } from "@/site/demo-block";
import { SourceBlock } from "@/site/docs/code-block";
import { PageDescription, PageTitle, pageFooterClass } from "@/site/docs/page-parts";
import type { RegistryPageData } from "@/site/docs/registry-source";
import { Tab, Tabs } from "@/site/docs/tabs";
import { DOCS_HOME, docsHref, GITHUB_URL, headingId } from "@/site/docs/urls";
import { highlight, readSource } from "@/site/highlight";
import { getItem, installCommand, installUrlCommand, REGISTRY_NAMESPACE } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

function C({ children }: { children: React.ReactNode }) {
  return <code>{children}</code>;
}

async function Command({ code, className }: { code: string; className?: string }) {
  return <SourceBlock html={await highlight(code, "bash")} className={className} />;
}

async function Manual({ item }: { item: RegistryItem }) {
  const helpers = item.libs.filter((lib) => lib !== "lib/utils.ts");
  const [files, libs] = await Promise.all([
    Promise.all(item.files.map((file) => readSource(file))),
    Promise.all(helpers.map((lib) => readSource(lib))),
  ]);
  const add = [
    item.dependencies.length > 0 ? `pnpm add ${item.dependencies.join(" ")}` : null,
    item.devDependencies.length > 0 ? `pnpm add -D ${item.devDependencies.join(" ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const required = item.registryDependencies.map((slug) => getItem(slug)).filter((dep) => dep != null);
  const usesUtils = item.libs.includes("lib/utils.ts");

  return (
    <Steps>
      {add ? (
        <Step>
          <h3>Install the dependencies</h3>
          <Command code={add} className="my-4" />
        </Step>
      ) : null}
      {required.length > 0 ? (
        <Step>
          <h3>Add the components it uses</h3>
          <p>
            {required.map((dep, i) => (
              <span key={dep.slug}>
                {i > 0 ? ", " : null}
                <Link href={docsHref(dep)}>{dep.name}</Link>
              </span>
            ))}
          </p>
        </Step>
      ) : null}
      {libs.length > 0 ? (
        <Step>
          <h3>Copy the helpers</h3>
          <div className="mt-4 space-y-4">
            {libs.map((file) => (
              <SourceBlock key={file.path} html={file.html} title={file.path} expandable />
            ))}
          </div>
        </Step>
      ) : null}
      <Step>
        <h3>Copy the source</h3>
        {usesUtils ? (
          <p>
            It uses the <C>cn()</C> helper and the theme tokens. See{" "}
            <Link href={`${DOCS_HOME}/installation#manual`}>Installation</Link>.
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {files.map((file) => (
            <SourceBlock key={file.path} html={file.html} title={file.path} expandable />
          ))}
        </div>
      </Step>
    </Steps>
  );
}

async function SuspenseNote({ item }: { item: RegistryItem }) {
  const group = item.props[0];
  const component = group?.component ?? item.name.replace(/[^A-Za-z0-9]/g, "");
  const labelled = group?.props.some((prop) => prop.name === "label") ?? false;
  const noun = item.name.split(" ")[0];
  const code = [
    `import { Suspense } from "react";`,
    "",
    `<Suspense fallback={<div className="${labelled ? "h-16" : "h-72"}" />}>`,
    `  <${component} ${labelled ? "label" : "aria-label"}="${noun}" />`,
    "</Suspense>",
  ].join("\n");

  return (
    <>
      <Heading as="h3" id="install-nextjs">
        In a Next.js app
      </Heading>
      <p>
        {item.name} reads today&apos;s date while it renders. With Cache Components turned on, Next.js stops the build
        unless that happens inside React&apos;s <C>Suspense</C>, so wrap it in one. Give the fallback the size of the
        control so nothing moves when it appears. Our blocks and templates that use it already do this.
      </p>
      <SourceBlock html={await highlight(code, "tsx")} />
    </>
  );
}

const importsArt = /^import\s[^;]*["']@\/registry\/lib\/art["']/m;
const importsData = /^import\s[^;]*["']@\/registry\/lib\/data["']/m;

function SiteFile({ name }: { name: "art.ts" | "data.ts" }) {
  return (
    <a
      href={`${GITHUB_URL}/blob/main/src/registry/lib/${name}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono font-medium text-brand-strong underline decoration-brand-strong decoration-[1.5px] underline-offset-[3.5px] transition-opacity duration-200 hover:opacity-80"
    >
      {name}
    </a>
  );
}

function SiteFilesNote({ code, dataNeedsArt }: { code: string; dataNeedsArt: boolean }) {
  const art = importsArt.test(code);
  const data = importsData.test(code);
  if (!art && !data) return null;

  let text: React.ReactNode;
  if (art && data) {
    text = (
      <>
        generated pictures and sample data from this site: <SiteFile name="art.ts" /> and <SiteFile name="data.ts" />.
        Copy those files from the repository, or use your own images and data in their place.
      </>
    );
  } else if (art) {
    text = (
      <>
        generated pictures from this site: <SiteFile name="art.ts" />. Copy that file from the repository, or use your
        own images in its place.
      </>
    );
  } else if (dataNeedsArt) {
    text = (
      <>
        sample data from this site: <SiteFile name="data.ts" />, which also needs <SiteFile name="art.ts" />. Copy those
        files from the repository, or use your own data in their place.
      </>
    );
  } else {
    text = (
      <>
        sample data from this site: <SiteFile name="data.ts" />. Copy that file from the repository, or use your own
        data in its place.
      </>
    );
  }

  return <p className="mb-3 text-[13px] leading-5 text-muted-foreground">This example uses {text}</p>;
}

function typeTable(group: ComponentPropsDoc): Record<string, TypeNode> {
  return Object.fromEntries(
    group.props.map((prop) => [
      prop.name,
      {
        type: <code className="font-mono text-[13px]">{prop.type}</code>,
        description: prop.description,
        default: prop.default ? <code>{prop.default}</code> : undefined,
        required: true,
      },
    ]),
  );
}

export async function ComponentPage({ data }: { data: RegistryPageData }) {
  const item = data.slug ? getItem(data.slug) : undefined;
  if (!item) notFound();

  const [demoSources, dataSource] = await Promise.all([
    Promise.all(item.demos.map((demo) => readSource(demo.file))),
    readSource("registry/lib/data.ts"),
  ]);
  const dataNeedsArt = importsArt.test(dataSource.code);
  const several = item.demos.length > 1;

  return (
    <DocsPage
      toc={data.toc}
      breadcrumb={{ includeRoot: true, includeSeparator: true }}
      footer={{ className: pageFooterClass, children: <DocsFooter /> }}
    >
      <PageTitle>{item.name}</PageTitle>
      <PageDescription>{item.description}</PageDescription>
      <DocsBody>
        {item.demos.map((demo, i) => (
          <div key={demo.name} className={several ? undefined : "mt-2"}>
            {several ? (
              <Heading as="h2" id={headingId("demo", demo.name)}>
                {demo.title}
              </Heading>
            ) : null}
            <DemoBlock
              slug={item.slug}
              name={item.name}
              demo={demo.name}
              title={demo.title}
              showTitle={false}
              preview={item.preview}
              code={
                <>
                  <SiteFilesNote code={demoSources[i].code} dataNeedsArt={dataNeedsArt} />
                  <SourceBlock
                    html={demoSources[i].html}
                    title={demoSources[i].path.split("/").pop()}
                    maxHeight={Math.max(item.preview.height, 480)}
                  />
                </>
              }
            />
          </div>
        ))}

        {item.files.length > 0 ? (
          <>
            <Heading as="h2" id="install">
              Install
            </Heading>
            <Tabs items={["CLI", "URL", "Manual"]}>
              <Tab value="CLI">
                <Command code={installCommand(item.slug)} />
                <p>
                  This needs the <C>{REGISTRY_NAMESPACE}</C> registry in your <C>components.json</C>. See{" "}
                  <Link href={`${DOCS_HOME}/shadcn-cli`}>Using the shadcn CLI</Link>.
                </p>
              </Tab>
              <Tab value="URL">
                <Command code={installUrlCommand(item.slug)} />
                <p>This works without the registry entry.</p>
              </Tab>
              <Tab value="Manual">
                <Manual item={item} />
              </Tab>
            </Tabs>
            {item.suspense ? <SuspenseNote item={item} /> : null}
          </>
        ) : null}

        {item.props.length > 0 ? (
          <>
            <Heading as="h2" id="props">
              Props
            </Heading>
            {item.props.map((group) => {
              const id = headingId("props", group.component);
              return (
                <section key={group.component}>
                  <Heading as="h3" id={id} className="font-mono text-base font-medium">
                    {group.component}
                  </Heading>
                  <TypeTable id={`${id}-prop`} type={typeTable(group)} />
                </section>
              );
            })}
          </>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}
