// Handler für DELETE-Anfragen an /api/requests/<id>
export async function onRequestDelete(context) {
  const { request, env, params } = context; // params enthält dynamische Pfadsegmente, hier params.id
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: "Request ID is required" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const stmt = env.DB.prepare("DELETE FROM game_requests WHERE id = ?");
    await stmt.bind(id).run();
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
