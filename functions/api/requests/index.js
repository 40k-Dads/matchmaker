// Handler für POST-Anfragen an /api/requests
export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const playerName = body.name;
    const gameDate = body.date;

    if (!playerName || !gameDate) {
      return new Response(
        JSON.stringify({ error: "Name and date are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const stmt = env.DB.prepare(
      "INSERT INTO game_requests (player_name, game_date) VALUES (?, ?)"
    );
    await stmt.bind(playerName, gameDate).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
// OPTIONS Handler (wie in games.js) hier hinzufügen oder eine Middleware nutzen
export async function onRequestOptions(context) {
  /* ... CORS OPTIONS handler ... */ return new Response(null, {
    headers: {
      /*...*/
    },
  });
}
