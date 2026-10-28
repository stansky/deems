import { cp, mkdir } from "node:fs/promises";
await mkdir("public/excalidraw-assets",{recursive:true});
await cp("node_modules/@excalidraw/excalidraw/dist/prod/fonts","public/excalidraw-assets/fonts",{recursive:true});

await mkdir("public/swagger-ui",{recursive:true});
for (const file of ["swagger-ui-bundle.js","swagger-ui.css","LICENSE","NOTICE"]) {
  await cp(`node_modules/swagger-ui-dist/${file}`,`public/swagger-ui/${file}`);
}
