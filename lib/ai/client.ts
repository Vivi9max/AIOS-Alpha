export interface ChatRequest {
  apiKey: string;
  baseURL: string;
  model: string;
  prompt: string;
}

export async function createChatCompletion(
  request: ChatRequest
) {
  const response = await fetch(
    `${request.baseURL}/chat/completions`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: request.model,

        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      }),
    }
  );

  return response.json();
}