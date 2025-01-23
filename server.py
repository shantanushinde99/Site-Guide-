from flask import Flask, request, jsonify
import requests
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_cloud_sdk_core import BaseService

app = Flask(__name__)

# Your API Key
api_key = "qAAt-UxIbabqwOcnr6TY_4KH-r_Kn_B_cwHrAIxIwEAz"

# Create the IAM authenticator using your API key
authenticator = IAMAuthenticator(api_key)

# Create a base service object (to handle authentication)
service = BaseService(authenticator=authenticator)

# Get the access token using the IAM authenticator
token = authenticator.token_manager.get_token()

# Full system prompt to be included
system_prompt = """
You are tasked with processing the provided URL and identifying one and only the most relevant clickable element (e.g., buttons, links, etc.) from the webpage that directly matches the user's original prompt.

How it works:

Focus: When provided with a website URL and a prompt, your task is to extract the most relevant clickable link based on the user's request.
No Additional Details: Do not provide the full details of the website or additional information beyond the single most relevant clickable link.
JSON Format: Return the response in the provided JSON format, or an empty JSON object ({}) if no relevant clickable element is found.

JSON Schema Reference (for understanding the format):

{
    "$defs": {
        "ClickableElement": {
            "properties": {
                "element_type": {
                    "title": "Element Type",
                    "type": "string"
                },
                "text": {
                    "title": "Text",
                    "type": "string"
                },
                "link": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "title": "Link"
                }
            },
            "required": [
                "element_type",
                "text",
                "link"
            ],
            "title": "ClickableElement",
            "type": "object"
        }
    },
    "properties": {
        "clickable_element": {
            "$ref": "#/$defs/ClickableElement",
            "title": "Clickable Element",
            "type": "object"
        }
    },
    "required": [
        "clickable_element"
    ],
    "title": "ClickableElementResponse",
    "type": "object"
}
"""

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    user_link = data.get("link")
    user_prompt = data.get("prompt")

    body = {
        "input": f"URL: {user_link}\nPrompt: {user_prompt}\n{system_prompt}",
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 900,
            "min_new_tokens": 0,
            "repetition_penalty": 1
        },
        "model_id": "mistralai/mistral-large",
        "project_id": "89555831-3a2a-4906-8c12-216e30650073"
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    response = requests.post("https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29", headers=headers, json=body)

    if response.status_code != 200:
        return jsonify({"error": "Non-200 response"}), 500

    data = response.json()

    if 'results' in data and len(data['results']) > 0:
        generated_text = data['results'][0]['generated_text']
        clickable_element = {
            "element_type": "link",
            "text": generated_text.strip(),
            "link": None  # Assuming link might not be provided in the generated text
        }
        return jsonify({"clickable_element": clickable_element})
    else:
        return jsonify({})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
