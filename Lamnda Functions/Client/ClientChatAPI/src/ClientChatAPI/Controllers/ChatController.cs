using Amazon.Lambda.Core;
using ClientChatAPI.Services;
using ClientChatLambda.models.Requests;
using Microsoft.AspNetCore.Mvc;

namespace ClientChatAPI.Controllers;

[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ILambdaLogger? _logger;
    private readonly IChatService _chatService;
    
    public ChatController(IChatService chatService, ILambdaLogger? logger = null)
    {
        _logger = logger;
        _chatService = chatService;
    }
    
    // POST: api/chat/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateChat([FromBody] CreateChatRequest request)
    {
        if(request is null || string.IsNullOrEmpty(request.client_id) || string.IsNullOrEmpty(request.address))
        {
            _logger?.LogError($"Invalid request: client_id: {request.client_id} ,address: {request.address}");
            return BadRequest("Invalid request");
        }
        
        _logger?.LogInformation($"Creating chat for client {request.client_id} with address {request.address}");
        try
        {
            var chatId = await _chatService.CreateChat(request.client_id, request.address);
            _logger?.LogInformation($"Chat created with id {chatId}");
            return Ok(new { chatId });
        }
        catch (Exception e)
        {
            _logger?.LogError($"Error creating chat: {e.Message}");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost]
    public async Task<IActionResult> RecieveMessage([FromBody] RecieveMessageRequest request)
    {
        if (string.IsNullOrEmpty(request.chat_id) || string.IsNullOrEmpty(request.message))
        {
            return BadRequest("Invalid request");
        }
        
        _logger?.LogInformation($"Recieving message for chat {request.chat_id}: {request.message}");
        
        try
        {
            // Check if the chat belongs to the client
            if(!await _chatService.CheckChatClient(request.chat_id, request.client_id))
            {
                _logger?.LogWarning($"Chat {request.chat_id} does not belong to client {request.client_id}");
                return Unauthorized("Chat does not belong to client");
            }
            
            // Process the message
            var response = await _chatService.ReceiveMessage(request.chat_id, request.message);
            _logger?.LogInformation($"Message received for chat {request.chat_id}");
            
            return Ok(new {message = response.response, cart = response.cart});
        }
        catch (KeyNotFoundException e)
        {
            _logger?.LogError($"Chat with id {request.chat_id} not found: {e.Message}");
            return NotFound($"Chat with id {request.chat_id} not found");
        }
        catch (Exception e)
        {
            _logger?.LogError($"Error receiving message: {e.Message}");
            return StatusCode(500, "Internal server error");
        }
        
        return Ok();
    }
}