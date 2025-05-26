using System.Runtime.CompilerServices;
using Amazon.Lambda.Core;
using OpenAI.Chat;

namespace ClientChatAPI.AIAgents;

public abstract class OpenAIAgentBase
{
    protected readonly ChatClient AgentClient;
    
    public ILambdaLogger? Logger { get; set; }

    public OpenAIAgentBase(OpenAIAgentModels.Model model)
    {
        var apiKey = Environment.GetEnvironmentVariable("OpenAIKey");
        AgentClient = new ChatClient(OpenAIAgentModels.GetModelName(model), apiKey);
    }

    protected virtual async Task<(List<T?> outputObj, string? message)> AskOpenAIAsync<T>(List<ChatMessage> messages,
        ChatCompletionOptions options = default, Func<ChatToolCall, T>? onTool = null) where T : class
    {
        List<T> toolCallsResult = new List<T>();
        var response = await AgentClient.CompleteChatAsync(messages, options);
            if (response is null)
            {
                Logger?.LogError("No response from the AI agent.");
                throw new Exception("No response from the AI agent.");
            }

            if (response.Value.ToolCalls.Count == 0)
            {
                Logger?.LogError("No choices in the response from the AI agent.");
                return (null,response.Value.Content[0].Text);
            }

            foreach (var toolCall in response.Value.ToolCalls)
            {
                if (toolCall is null)
                {
                    Logger?.LogError("No tool call in the response from the AI agent.");
                    continue;
                }

                toolCallsResult.Add(onTool?.Invoke(toolCall));
            }

            string? responseText = response.Value.Content.Count == 0 ? null : response.Value.Content[0].Text;
            

            return (toolCallsResult, responseText);
    }
}