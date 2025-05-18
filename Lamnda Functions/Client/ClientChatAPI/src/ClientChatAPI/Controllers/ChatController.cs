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
}