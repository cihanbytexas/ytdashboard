import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { channel_handle, api_key } = req.body;

  if (!channel_handle || !api_key) {
    return res.status(400).json({ error: "channel_handle and api_key are required" });
  }

  const headers = { "User-Agent": "Mozilla/5.0" };
  const url = `https://www.youtube.com/${channel_handle}`;

  try {
    // --- 1️⃣ Scraping ---
    const htmlRes = await fetch(url, { headers });
    const html = await htmlRes.text();

    let m = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!m) m = html.match(/window\["ytInitialData"\] = ({.*?});/);

    if (!m) {
      return res.status(500).json({ error: "ytInitialData not found. Consent/GDPR issue?" });
    }

    const data = JSON.parse(m[1]);

    let meta = data.metadata.channelMetadataRenderer;
    const channel_id = meta.externalId;
    const title = meta.title;
    const description = meta.description;
    const avatar_url = meta.avatar.thumbnails.slice(-1)[0].url;
    const banner_url =
      meta.banner?.thumbnails?.slice(-1)[0]?.url || null;

    // --- 2️⃣ API: Abone/video/view ---
    const apiRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel_id}&key=${api_key}`
    );
    const apiData = await apiRes.json();
    const stats = apiData.items?.[0]?.statistics || {};

    const subscriber_count = stats.subscriberCount || "Bilinmiyor";
    const video_count = stats.videoCount || "Bilinmiyor";
    const view_count = stats.viewCount || "Bilinmiyor";

    // --- JSON Response ---
    res.status(200).json({
      channel_id,
      title,
      description,
      avatar_url,
      banner_url,
      subscriber_count,
      video_count,
      view_count
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
