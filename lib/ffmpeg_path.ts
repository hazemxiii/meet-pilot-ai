import path from "path";
import fs from "fs";
export function resolveFfmpegPath(): string {
  // ffmpeg-static's exported path can get mangled by the bundler (Turbopack
  // sometimes rewrites __dirname to a virtual "/ROOT/..." path even when the
  // package is marked external). Verify it actually exists, and fall back to
  // resolving the binary directly from node_modules if not.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const exported = require("ffmpeg-static") as string | null;
  if (exported && fs.existsSync(exported)) {
    return exported;
  }

  const fallback = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );

  if (fs.existsSync(fallback)) {
    return fallback;
  }

  throw new Error(
    `Could not locate ffmpeg binary. Tried "${exported}" and "${fallback}". Run "npm ls ffmpeg-static" to confirm it installed correctly.`,
  );
}
