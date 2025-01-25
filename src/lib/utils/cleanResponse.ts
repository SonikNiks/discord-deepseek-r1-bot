function cleanAIResponse(response: string) {
  // Use a regular expression to remove <think> tags and their content
  // This handles multi-line content and extra spaces/attributes
  const cleanedResponse = response
    .replace(/<think[^>]*>[\s\S]*?<\/think>/g, "")
    .trim();

  return cleanedResponse;
}

export default cleanAIResponse;
