/**
 * Seed script: populates the Firestore `phrases` collection from phrase-data.ts.
 *
 * Uses the Firebase CLI's stored access token, so just run `firebase login`
 * first and then:
 *
 *   npx tsx scripts/seed-phrases.ts
 */
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Difficulty scoring (mirrors phrases.ts logic exactly) ──────────────

const LETTER_FREQ: Record<string, number> = {
  e: 13, t: 9.1, a: 8.2, o: 7.5, i: 7, n: 6.7, s: 6.3, h: 6.1,
  r: 6, d: 4.3, l: 4, c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2,
  g: 2, y: 2, p: 1.9, b: 1.5, v: 1, k: 0.8, j: 0.15, x: 0.15,
  q: 0.1, z: 0.07,
};

const calculateDifficulty = (text: string): number => {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  const unique = new Set(letters);
  let raritySum = 0;
  for (const ch of unique) raritySum += 14 - (LETTER_FREQ[ch] || 0);
  return unique.size * 3 + letters.length * 0.5 + (raritySum / unique.size) * 2;
};

const classify = (score: number): "easy" | "medium" | "hard" => {
  if (score < 54) return "easy";
  if (score < 61) return "medium";
  return "hard";
};

// ── Parse phrases from phrase-data.ts ──────────────────────────────────

const content = readFileSync(
  resolve(__dirname, "../src/features/game/utils/phrase-data.ts"),
  "utf-8",
);

const phrases: { text: string; category: string }[] = [];
const re = /\{\s*text:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g;
let m: RegExpExecArray | null;
while ((m = re.exec(content)) !== null) phrases.push({ text: m[1], category: m[2] });
console.log(`Parsed ${phrases.length} phrases`);

// ── Config ─────────────────────────────────────────────────────────────

const projectId = JSON.parse(
  readFileSync(resolve(__dirname, "../.firebaserc"), "utf-8"),
).projects?.default as string;

if (!projectId) {
  console.error("No default project in .firebaserc");
  process.exit(1);
}

// Get access token from Firebase CLI config
const firebaseConfig = JSON.parse(
  readFileSync(
    join(homedir(), ".config/configstore/firebase-tools.json"),
    "utf-8",
  ),
);

const refreshToken = firebaseConfig.tokens?.refresh_token as string;
if (!refreshToken) {
  console.error("No refresh token found. Run: npx firebase login");
  process.exit(1);
}

// Exchange refresh token for a fresh access token
const GOOGLE_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ── Firestore REST helpers ──────────────────────────────────────────────

const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function seed() {
  const token = await getAccessToken();
  console.log(`Project: ${projectId}`);

  // Fetch existing phrase texts
  const existing = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = `${BASE}/phrases?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      documents?: { fields: Record<string, { stringValue?: string }> }[];
      nextPageToken?: string;
    };
    if (data.documents) {
      for (const doc of data.documents) {
        const t = doc.fields?.text?.stringValue;
        if (t) existing.add(t);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Found ${existing.size} existing phrases in Firestore`);

  const toAdd = phrases.filter((p) => !existing.has(p.text));
  if (toAdd.length === 0) {
    console.log("All phrases already seeded!");
    return;
  }

  console.log(`Adding ${toAdd.length} new phrases...`);

  // Batch commit (max 200 writes per request)
  const BATCH = 200;
  let added = 0;

  for (let i = 0; i < toAdd.length; i += BATCH) {
    const chunk = toAdd.slice(i, i + BATCH);
    const writes = chunk.map((p) => ({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/phrases/${crypto.randomUUID()}`,
        fields: {
          text: { stringValue: p.text },
          category: { stringValue: p.category },
          difficulty: { stringValue: classify(calculateDifficulty(p.text)) },
          rand: { doubleValue: Math.random() },
        },
      },
    }));

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ writes }),
      },
    );

    if (!res.ok) throw new Error(`Batch failed: ${await res.text()}`);
    added += chunk.length;
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${added}/${toAdd.length}`);
  }

  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const p of phrases) counts[classify(calculateDifficulty(p.text))]++;
  console.log("\nDifficulty distribution:", counts);
  console.log(`Total in Firestore: ${existing.size + toAdd.length}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
