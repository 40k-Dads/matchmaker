// Handler für GET-Anfragen an /api/games?date=YYYY-MM-DD
export async function onRequestGet(context) {
  const { request, env } = context; // context enthält request, env, params, waitUntil, next, data
  const url = new URL(request.url);
  const gameDate = url.searchParams.get("date");

  // Headers für CORS (insbesondere für lokale Entwicklung wichtig)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Anpassen für Produktion!
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (!gameDate) {
    return new Response(
      JSON.stringify({ error: "Date parameter is required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const stmtRequests = env.DB.prepare(
      "SELECT id, player_name FROM game_requests WHERE game_date = ?"
    );
    const stmtConfirmed = env.DB.prepare(
      "SELECT id, player1_name, player2_name FROM confirmed_games WHERE game_date = ?"
    );

    const [requestsResult, confirmedResult] = await Promise.all([
      stmtRequests.bind(gameDate).all(),
      stmtConfirmed.bind(gameDate).all(),
    ]);

    return new Response(
      JSON.stringify({
        requests: requestsResult.results || [],
        confirmed: confirmedResult.results || [],
      }),
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// Handler für OPTIONS (Preflight für CORS)
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Anpassen für Produktion
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
