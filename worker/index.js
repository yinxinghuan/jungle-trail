/**
 * Jungle Trail is a frontend-only experience.
 *
 * The AlterU session deployer requires this named handler so it can package
 * the Vite dist/ directory behind the permanent game UUID. No API routes or
 * persistent state are implemented for this game.
 */
export async function handleApi(request) {
  if (new URL(request.url).pathname.endsWith('/api/health')) {
    return Response.json({
      ok: true,
      storage: null,
      identity_mode: 'frontend-only',
    });
  }

  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
