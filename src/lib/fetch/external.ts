import follow from "follow-redirects";

const https = follow.https;

async function makeRequest(message: string, model: string) {
  const options = {
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

  const postData = JSON.stringify({
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
  });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        resolve(body);
      });

      res.on("error", (error) => {
        reject(error);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function generateAPIResponse(model?: string, message?: string) {
  const response = await makeRequest(message, model);
  const json = JSON.parse(response);

  return json?.choices[0]?.message?.content;
}

export default generateAPIResponse;
