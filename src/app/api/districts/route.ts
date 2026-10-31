import { listDistricts } from "@/geo/tr";

export function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city") ?? "";
  const districts = listDistricts(city);
  if (!districts) return Response.json({ error: "Bilinmeyen il." }, { status: 404 });
  return Response.json({ districts }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
