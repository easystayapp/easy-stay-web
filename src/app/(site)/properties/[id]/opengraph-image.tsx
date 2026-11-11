import { ImageResponse } from "next/og";
import { GENDER_LABEL, PROPERTY_TYPE_SHORT, SHARING_LABEL } from "@/lib/domain/catalog";
import { getRepositories } from "@/lib/server/repositories";
import { getPropertyDetail } from "@/lib/server/services/properties";
import { absoluteUrl } from "@/lib/seo";

export const alt = "EasyStay listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
/** Cached for an hour; edits to a listing show up in new shares after that. */
export const revalidate = 3600;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Share card for WhatsApp / Facebook / X: cover photo, title, area, rent and rating. */
export default async function OpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: Awaited<ReturnType<typeof getPropertyDetail>> | null = null;
  try {
    p = await getPropertyDetail(await getRepositories(), id, null);
  } catch {
    p = null;
  }
  const logo = absoluteUrl("/brand/logo-mark.png");

  if (!p) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#fff1f2", fontSize: 64, fontWeight: 800, color: "#1e1b1f" }}>
          EasyStay
        </div>
      ),
      size,
    );
  }

  const cover = p.photos[0] ? (p.photos[0].startsWith("http") ? p.photos[0] : absoluteUrl(p.photos[0])) : null;
  const facts = [PROPERTY_TYPE_SHORT[p.type], SHARING_LABEL[p.sharing], GENDER_LABEL[p.availableFor], p.food ? "Food included" : null].filter(Boolean) as string[];
  const rating = p.rating.count > 0 && p.rating.average != null ? `★ ${p.rating.average.toFixed(1)} · ${p.rating.count} ${p.rating.count === 1 ? "rating" : "ratings"}` : null;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", fontFamily: "sans-serif" }}>
        {cover && (
          <img src={cover} alt="" width={560} height={630} style={{ width: 560, height: 630, objectFit: "cover" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 56px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logo} alt="" width={52} height={46} />
            <span style={{ fontSize: 34, fontWeight: 800, color: "#1e1b1f" }}>EasyStay</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontSize: p.title.length > 40 ? 44 : 54, fontWeight: 800, lineHeight: 1.1, color: "#1e1b1f" }}>{p.title.slice(0, 80)}</span>
            <span style={{ fontSize: 28, color: "#4f4a50" }}>{`${p.locality}, ${p.city}`.slice(0, 70)}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {facts.map((f) => (
                <span key={f} style={{ fontSize: 22, fontWeight: 700, color: "#4c2a9e", background: "#f1ebff", padding: "6px 16px", borderRadius: 999 }}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 60, fontWeight: 800, color: "#d62843" }}>{inr(p.rent)}</span>
              <span style={{ fontSize: 26, color: "#4f4a50" }}>/month</span>
            </div>
            {rating && <span style={{ fontSize: 26, fontWeight: 700, color: "#1e1b1f" }}>{rating}</span>}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
