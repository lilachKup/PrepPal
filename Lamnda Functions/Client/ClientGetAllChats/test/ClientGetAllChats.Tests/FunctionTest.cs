using Amazon.Lambda.APIGatewayEvents;
using Xunit;
using Amazon.Lambda.Core;
using Amazon.Lambda.TestUtilities;
using ClientChatLambda.models;
using ClientChatLambda.Repositories;
using Moq;

namespace ClientGetAllChats.Tests;

public class FunctionTest
{
    // [Fact]
    // public void TestToUpperFunction()
    // {
    //
    //     // Invoke the lambda function and confirm the string was upper cased.
    //     var function = new Function();
    //     var context = new TestLambdaContext();
    //     var upperCase = function.FunctionHandler("hello world", context);
    //
    //     Assert.Equal("HELLO WORLD", upperCase);
    // }

    [Fact]
    public void TestTest()
    {
        Assert.True(true);
    }
    
    [Fact]
    public async Task TestGetAllChats()
    {
        var function = new Function();
        var context = new TestLambdaContext();
        var request = new APIGatewayProxyRequest
        {
            QueryStringParameters = new Dictionary<string, string>
            {
                { "id", "1" }
            }
        };
        
        // here i want to mock the repository
        // but i don't know how to do it
        //what sdk do you use to mock the repository
        // i use moq
         var repository = new Mock<IChatRepository>(); //the compiler will not find the class
         repository.Setup(x => x.GetChatsByUserId(It.IsAny<string>(), It.IsAny<IComparer<ChatEntity>>()))
            .ReturnsAsync(new List<ChatEntity>
            {
                new ChatEntity
                {
                    client_id = "1",
                    chat_id = "1",
                    order_products = new List<Product>(),
                    created_at = DateTime.UtcNow,
                    updated_at = DateTime.UtcNow,
                    messages = new List<MessageEntity>()
                }
            });
         
         
        // Set the repository to the function
        function.SetRepository(repository.Object);
         
        var response = await function.FunctionHandler(request, context);
        
        Console.WriteLine(response.Body);

        Assert.Equal(200, response.StatusCode);
        Assert.NotNull(response.Body);
    }
}
