import json
from typing import Dict, Optional, Any


def validate_request(request_body):

    if not isinstance(request_body, dict):
        return False, 'request must be a dict'

    # if 'create_chat' not in request_body:
    #     return False, 'request must include create_chat'

    if 'chat_id' not in request_body:
        return False, 'request must include chat_id'

    if 'client_id' not in request_body:
        return False, 'request must include client_id'

    if 'message' not in request_body:
        return False, 'request must include message'

    return True, ''



def create_response(status_code: int, body: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Create a standardized API Gateway response"""
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }

    if headers:
        default_headers.update(headers)

    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body, default=str)
    }
def error_response(message: str, status_code: int = 400, error_code: Optional[str] = None) -> Dict[str, Any]:
    """Create an error response"""
    body = {
        'success': False,
        'message': message
    }
    if error_code:
        body['error_code'] = error_code

    return create_response(status_code, body)

def validation_error_response(message: str = "Validation error") -> Dict[str, Any]:
    """Create a validation error response"""
    return error_response(message, 400, "VALIDATION_ERROR")

def not_found_response(message: str = "Not found") -> Dict[str, Any]:
    """Create an error response"""
    return error_response(message, 404, "NOT_FOUND")

def success_response(body) -> Dict[str, Any]:
    """Create a success response"""
    return create_response(200, body)

def internal_server_error_response(message: str = "Internal server error") -> Dict[str, Any]:
    """Create a internal_server_error response"""
    return error_response(message, 500, "INTERNAL_SERVER_ERROR")

def handle_cors(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Handle CORS preflight requests"""
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {}, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
        })
    return None




