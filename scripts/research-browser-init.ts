/* Trusted Playwright page hook: prevent the browser from issuing mutations. */
exports.default = async function researchBrowserInit({ page }: { page: { route: Function; on: Function } }) {
  await page.route("**/*", (route: any) => {
    const method = route.request().method();
    return method === "GET" || method === "HEAD" ? route.continue() : route.abort("blockedbyclient");
  });
  page.on("dialog", (dialog: any) => dialog.dismiss().catch(() => undefined));
};
