// Handler für POST-Anfragen an /api/confirm
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
    const requestId = body.requestId;
    const acceptingPlayerName = body.acceptingPlayerName;

    if (!requestId || !acceptingPlayerName) {
      return new Response(
        JSON.stringify({
          error: "Request ID and accepting player name are required",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Spielgesuch finden
    const findStmt = env.DB.prepare(
      "SELECT player_name, game_date FROM game_requests WHERE id = ?"
    );
    const requestInfo = await findStmt.bind(requestId).first();

    if (!requestInfo) {
      return new Response(
        JSON.stringify({ error: "Request not found or already accepted" }),
        { status: 404, headers: corsHeaders }
      );
    }
    if (requestInfo.player_name === acceptingPlayerName) {
      return new Response(
        JSON.stringify({ error: "You cannot accept your own request" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Transaktion: Gesuch löschen UND bestätigtes Spiel erstellen
    const deleteStmt = env.DB.prepare("DELETE FROM game_requests WHERE id = ?");
    const insertStmt = env.DB.prepare(
      "INSERT INTO confirmed_games (player1_name, player2_name, game_date) VALUES (?, ?, ?)"
    );

    await env.DB.batch([
      deleteStmt.bind(requestId),
      insertStmt.bind(
        requestInfo.player_name,
        acceptingPlayerName,
        requestInfo.game_date
      ),
    ]);

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
// OPTIONS Handler hier hinzufügen
export async function onRequestOptions(context) {
  /* ... CORS OPTIONS handler ... */ return new Response(null, {
    headers: {
      /*...*/
    },
  });
}
