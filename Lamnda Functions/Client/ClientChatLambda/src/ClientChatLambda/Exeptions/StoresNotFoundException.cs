namespace ClientChatLambda.Exeptions;

public class StoresNotFoundException : Exception
{
    public StoresNotFoundException(string message = "") : base(message)
    {
    }
}