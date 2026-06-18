import { readFile } from "node:fs/promises";
import path from "node:path";

const allowedFileNamePattern = /^[a-z0-9.-]+\.(jpg|jpeg|png|webp)$/i;
const photosDir = path.join(
  process.cwd(),
  "data",
  "source-old-catalog",
  "photos"
);

type RouteContext = {
  params: Promise<{
    file: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;

  if (!allowedFileNamePattern.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(photosDir, file);

  if (!filePath.startsWith(photosDir + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const image = await readFile(filePath);

    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": getContentType(file)
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function getContentType(file: string) {
  const extension = path.extname(file).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}
