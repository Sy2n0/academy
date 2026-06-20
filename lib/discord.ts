/**
 * Send a Discord webhook notification
 */
export async function sendDiscordWebhook(webhookUrl: string, content: string) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error('Failed to send Discord webhook:', err);
  }
}
