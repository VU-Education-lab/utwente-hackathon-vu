module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      ok: true,
      now: new Date().toISOString(),
      node: process.version,
      hasAzureEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      hasAzureKey: !!process.env.AZURE_OPENAI_API_KEY,
      hasElevenKey: !!process.env.ELEVENLABS_API_KEY,
    },
  };
};
