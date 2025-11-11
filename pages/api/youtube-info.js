import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method allowed." });
  }

  try {
    const { channel_handle, api_key } = req.body;
    if (!channel_handle || !api_key)
      return res.status(400).json({ error: "channel_handle and api_key required" });

    const headers = { "User-Agent": "Mozilla/5.0" };
    const url = `https://www.youtube.com/${channel_handle}`;
    const html = await (await fetch(url, { headers })).text();

    const match = html.match(/var ytInitialData = ({.*?});<\/script>/) ||
                  html.match(/window\["ytInitialData"\] = ({.*?});/);

    if (!match) {
      return res.status(500).json({ error: "ytInitialData not found (possible GDPR block)" });
    }

    const data = JSON.parse(match[1]);
    const meta = data.metadata?.channelMetadataRenderer;
    if (!meta) return res.status(500).json({ error: "Channel metadata not found" });

    const channel_id = meta.externalId;
    const title = meta.title;
    const description = meta.description;
    const avatar_url = meta.avatar?.thumbnails?.at(-1)?.url;
    const banner_url = meta.banner?.thumbnails?.at(-1)?.url || null;

    const api_url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel_id}&key=${api_key}`;
    const stats = await (await fetch(api_url)).json();

    const statistics = stats.items?.[0]?.statistics || {};
    const subscriber_count = statistics.subscriberCount || "Bilinmiyor";
    const video_count = statistics.videoCount || "Bilinmiyor";
    const view_count = statistics.viewCount || "Bilinmiyor";

    res.status(200).json({
      success: true,
      channel_id,
      title,
      description,
      avatar_url,
      banner_url,
      subscriber_count,
      video_count,
      view_count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
