import { buildLlmsFullTxt } from "@/lib/llms-corpus";

export function GET(): Response {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
