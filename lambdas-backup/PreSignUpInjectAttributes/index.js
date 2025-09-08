exports.handler = async (event) => {
  console.log("🟢 PreSignUp triggered");
  console.log("Before injection:", JSON.stringify(event.request.userAttributes, null, 2));

  if (!event.request.userAttributes["custom:user_type"]) {
    event.request.userAttributes["custom:user_type"] = "customer";
  }

  console.log("After injection:", JSON.stringify(event.request.userAttributes, null, 2));

  event.response = {
    autoConfirmUser: true,
    autoVerifyEmail: true
  };

  return event;
};