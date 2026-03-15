import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/**
 * Serves a small HTML page with dynamic OpenGraph tags for game invite links.
 *
 * When a URL like https://flipt-game.web.app/?code=AB3D is shared,
 * bots (Slack, iMessage, Facebook, etc.) hit this function and get
 * OG tags like "Zack invited you to play Flipt!". Real browsers
 * get a meta-refresh redirect to the SPA which handles the join flow.
 */
export const invite = onRequest(async (req, res) => {
  const code = (req.query.code as string || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!code) {
    // No code — redirect to the app root
    res.redirect("/");
    return;
  }

  // Look up the game by code
  let hostName = "Someone";
  let playerCount = 0;

  try {
    const gamesRef = db.collection("games");
    const snapshot = await gamesRef
      .where("code", "==", code)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const game = snapshot.docs[0].data();
      const players = game.players as Record<string, { displayName?: string }> | undefined;

      if (players) {
        const hostUid = game.hostUid as string;
        hostName = players[hostUid]?.displayName || "Someone";
        playerCount = Object.keys(players).length;
      }
    }
  } catch {
    // If Firestore lookup fails, fall back to generic OG tags
  }

  const title = `${hostName} invited you to play Flipt!`;
  const description = playerCount > 1
    ? `Join ${playerCount} players in a multiplayer phrase-guessing game.`
    : "Join a multiplayer phrase-guessing game.";
  const appUrl = `/?code=${encodeURIComponent(code)}`;

  // Return HTML with OG tags + instant redirect for real browsers
  res.set("Cache-Control", "public, max-age=60, s-maxage=300");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>

  <!-- OpenGraph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="https://flipt-game.web.app/og-image.png" />
  <meta property="og:url" content="https://flipt-game.web.app${appUrl}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="https://flipt-game.web.app/og-image.png" />

  <!-- Redirect real browsers to the SPA -->
  <meta http-equiv="refresh" content="0;url=${escapeAttr(appUrl)}" />
</head>
<body>
  <p>Redirecting to Flipt...</p>
  <script>window.location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`);
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}
