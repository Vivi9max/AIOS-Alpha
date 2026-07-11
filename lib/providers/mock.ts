export interface MockResponse {
  success: boolean;
  content: string;
}

export async function runMock(
  prompt: string
): Promise<MockResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      content: `API Error ${response.status}`,
    };
  }

  return await response.json();
}