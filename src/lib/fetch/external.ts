// @ts-expect-error - follow-redirects is not typed
import follow from "follow-redirects";

const https = follow.https;

interface ApiRequestOptions {
  method: string;
  hostname: string;
  path: string;
  headers: {
    "Content-Type": string;
    Accept: string;
    Authorization: string;
  };
  maxRedirects: number;
}

interface ApiRequestBody {
  messages: Array<{
    content: string;
    role: "system" | "user" | "assistant";
  }>;
  model: string;
  frequency_penalty: number;
  max_tokens: number;
  presence_penalty: number;
  response_format: {
    type: "text";
  };
  stop: null;
  stream: boolean;
  stream_options: null;
  temperature: number;
  top_p: number;
  tools: null;
  tool_choice: "none";
  logprobs: boolean;
  top_logprobs: null;
}

interface ApiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Function to make the API request
async function makeRequest(message: string, model: string): Promise<string> {
  const options: ApiRequestOptions = {
    method: "POST",
    hostname: "api.deepseek.com",
    path: "/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_TOKEN}`,
    },
    maxRedirects: 20,
  };

  const postData: ApiRequestBody = {
    messages: [
      {
        content: "You are a helpful assistant",
        role: "system",
      },
      {
        content: message,
        role: "user",
      },
    ],
    model: model || "deepseek-chat",
    frequency_penalty: 0,
    max_tokens: 2048,
    presence_penalty: 0,
    response_format: {
      type: "text",
    },
    stop: null,
    stream: false,
    stream_options: null,
    temperature: 1,
    top_p: 1,
    tools: null,
    tool_choice: "none",
    logprobs: false,
    top_logprobs: null,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let chunks: Buffer[] = [];

      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        resolve(body);
      });

      res.on("error", (error: Error) => {
        reject(error);
      });
    });

    req.on("error", (error: Error) => {
      reject(error);
    });

    req.write(JSON.stringify(postData));
    req.end();
  });
}

// Function to generate API response
async function generateAPIResponse(
  model: string,
  message: string
): Promise<string | string[] | null> {
  const response = await makeRequest(message, model);
  const json: ApiResponse = JSON.parse(response);
  const defaultMessage = "Sorry, I couldn't find any response for you.";

  if (json?.choices && json.choices.length > 1) {
    return json.choices.map((choice) => choice.message?.content);
  } else if (json?.choices && json.choices.length === 1) {
    return json?.choices?.[0]?.message?.content || defaultMessage;
  } else {
    return defaultMessage;
  }
}

export default generateAPIResponse;
