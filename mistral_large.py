import requests
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_cloud_sdk_core import BaseService
import json

# Your API Key
api_key = "qAAt-UxIbabqwOcnr6TY_4KH-r_Kn_B_cwHrAIxIwEAz"
# url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29"

# Create the IAM authenticator using your API key
authenticator = IAMAuthenticator(api_key)

# Create a base service object (to handle authentication)
service = BaseService(authenticator=authenticator)

# Get the access token using the IAM authenticator
token = authenticator.token_manager.get_token()

# Prompt user for both inputs (URL and the prompt)
user_link = input("Please enter the link: ")
user_prompt = input("Please enter your prompt: ")

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


# Construct the body for the request
body = {
    "input": f"URL: {user_link}\nPrompt: {user_prompt}\n{system_prompt}",  # Include both the URL, prompt and system prompt
    "parameters": {
        "decoding_method": "greedy",
        "max_new_tokens": 900,
        "min_new_tokens": 0,
        "repetition_penalty": 1
    },
    "model_id": "mistralai/mistral-large",
    "project_id": "89555831-3a2a-4906-8c12-216e30650073"
}

# Set headers for authentication
headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# Make the request to the API
url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29"
response = requests.post(url, headers=headers, json=body)

# Check if the response status is 200 (OK)
if response.status_code != 200:
    raise Exception(f"Non-200 response: {response.text}")

# Parse and extract the JSON format from the response
data = response.json()

# Extract the relevant part of the response, which is the JSON with the clickable element
if 'results' in data and len(data['results']) > 0:
    generated_text = data['results'][0]['generated_text']
    
    # Extract the clickable element directly from the generated text
    print("Generated response for the prompt:")
    print("{")
    print('  "clickable_element": {')
    print(f'    "element_type": "link",')
    print(f'    "text": "{generated_text.strip()}",')
    print("  }")
    print("}")
else:
    print("No relevant clickable element found.")