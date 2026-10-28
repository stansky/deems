export const dynamic = "force-dynamic";

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Deems API</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="/swagger-ui/swagger-ui.css">
  </head>
  <body>
    <main id="swagger-ui"></main>
    <script src="/swagger-ui/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          validatorUrl: null,
          supportedSubmitMethods: [],
          persistAuthorization: false,
          displayRequestDuration: true,
          docExpansion: "list",
          filter: true,
        });
      };
    </script>
  </body>
</html>`;

export async function GET() {
  return new Response(page, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
