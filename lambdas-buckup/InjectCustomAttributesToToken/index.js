/*exports.handler = async (event) => {
  console.log("🧪 User attributes received:", JSON.stringify(event.request.userAttributes, null, 2));

  const customClaims = {};
  for (const [key, value] of Object.entries(event.request.userAttributes)) {
    if (key.startsWith("custom:")) {
      customClaims[key] = value;
    }
  }

  event.response = event.response || {};
  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: customClaims
  };

  return event;
};*/
exports.handler = async (event) => {
  const attrs = event.request.userAttributes;

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:user_type': attrs['custom:user_type'] || '',
        'custom:address': attrs['custom:address'] || '',
        'custom:store_name': attrs['custom:store_name'] || '',
        'custom:store_opening_hours': attrs['custom:store_opening_hours'] || '',
        'custom:first_name': attrs['custom:first_name'] || '',
        'custom:last_name': attrs['custom:last_name'] || '',
        'custom:zip_code': attrs['custom:zip_code'] || ''
      }
    }
  };

  return event;
};

