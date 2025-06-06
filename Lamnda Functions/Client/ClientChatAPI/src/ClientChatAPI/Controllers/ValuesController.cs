﻿using Microsoft.AspNetCore.Mvc;

namespace ClientChatAPI.Controllers;

[Route("api/[controller]")]
public class ValuesController : ControllerBase
{
    // GET api/values
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(new string[] { "value1", "value2" });
    }

    // GET api/values/5
    [HttpGet("{id}")]
    public string Get(int id)
    {
        return "value";
    }

    // POST api/values
    [HttpPost]
    public void Post([FromBody] string value)
    {
    }

    // PUT api/values/5
    [HttpPut("{id}")]
    public void Put(int id, [FromBody] string value)
    {
    }

    // DELETE api/values/5
    [HttpDelete("{id}")]
    public void Delete(int id)
    {
    }
}