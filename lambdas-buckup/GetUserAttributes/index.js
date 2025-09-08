const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const sub = body.sub;

    if (!sub) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'sub is required' }),
      };
    }

    const result = await cognito.listUsers({
      UserPoolId: 'wtjb1x',
      Filter: `sub = "${sub}"`,
      Limit: 1,
    }).promise();

    if (!result.Users || result.Users.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const userAttributes = result.Users[0].Attributes;
    const attributesMap = {};
    userAttributes.forEach(attr => {
      attributesMap[attr.Name] = attr.Value;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(attributesMap),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
