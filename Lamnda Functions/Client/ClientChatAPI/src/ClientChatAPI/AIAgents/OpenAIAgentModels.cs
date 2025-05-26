namespace ClientChatAPI.AIAgents;

public static class OpenAIAgentModels
{
    public enum Model
    {
        GPT_3_5_Turbo,
        GPT_4O_MINI
    }
    
    public static string GetModelName(Model model)
    {
        return model switch
        {
            Model.GPT_3_5_Turbo => "gpt-3.5-turbo",
            Model.GPT_4O_MINI => "gpt-4o-mini",
            _ => throw new ArgumentOutOfRangeException(nameof(model), model, null)
        };
    }
    
}