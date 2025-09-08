exports.handler = async (event) => {
    console.warn("⚠️ Unknown WebSocket action received:", event.body);
  
    return {
      statusCode: 200
    };
  };
  