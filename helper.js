import { db } from "./index.js";

// Create method to get only data needed
const simplifyResult = (data, query) => {
  let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = new RegExp(`^${escapedQuery}(:[a-z0-9]+)?$`, "i");

  // filter the exact word searched
  let filteredResult = data.filter((result) => pattern.test(result.meta.id));

  // Get only properties needed for UI.
  const head = filteredResult[0].hwi;
  const headWord = head.hw.replace(/[^a-zA-Z]/g, "");
  const phonetics = head.prs[0]?.mw || "N/A";
  const sound = head.prs[0].sound.audio;
  const definitions = filteredResult.map((definition) => {
    return { pos: definition.fl, def: definition.shortdef };
  });

  return { hw: headWord, pho: phonetics, sound: sound, meaning: definitions };
};

// Create method to get user recent search
const getRecentQueries = async (userId) => {
  const queries = await db.query(
    `SELECT word, MAX(searched_at) AS last_searched
          FROM search_history
          WHERE user_id = $1
          GROUP BY word
          ORDER BY last_searched DESC
          LIMIT 5;    `,
    [userId],
  );

  return queries.rows;
};

export { simplifyResult, getRecentQueries };
