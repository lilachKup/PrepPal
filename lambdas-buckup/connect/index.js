exports.handler = async (event) => {
    console.log("🔌 $connect invoked — connectionId:", event.requestContext.connectionId);
    return { statusCode: 200 };
  };
  