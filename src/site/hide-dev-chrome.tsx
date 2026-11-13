export function HideDevChrome() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <style href="miyuki-hide-dev-chrome" precedence="miyuki-site">
      {"nextjs-portal{display:none!important}"}
    </style>
  );
}
