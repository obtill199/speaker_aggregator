export type GreatDealAlert = {
  title: string;
  url: string;
  score: number | null;
};

export async function sendGreatDealAlerts(deals: GreatDealAlert[]) {
  const user = process.env.PUSHOVER_USER_KEY;
  const token = process.env.PUSHOVER_APP_TOKEN;
  if (!deals.length || !user || !token) return { sent: 0, enabled: Boolean(user && token) };

  let sent = 0;
  for (const deal of deals.slice(0, 10)) {
    const body = new URLSearchParams({
      token,
      user,
      title: "The Sound Room · Great Deal",
      message: `${deal.title} scored ${deal.score ?? "—"}/100`,
      url: deal.url,
      url_title: "Open listing",
      priority: "0",
    });
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error(`Pushover returned ${response.status}.`);
    sent += 1;
  }
  return { sent, enabled: true };
}
