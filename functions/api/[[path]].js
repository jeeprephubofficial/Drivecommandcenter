export async function onRequest({ request }) {
  const incoming = new URL(request.url);

  const target = new URL(
    incoming.pathname + incoming.search,
    "https://drive-command-center-api.jeeprephubofficial.workers.dev"
  );

  const init = {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(target.toString(), init);
}
