from flask import Flask, request, jsonify, render_template
import requests
import os
import asyncio
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_cloud_sdk_core import BaseService
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from browser_use import Agent, Browser
from pydantic import SecretStr

app = Flask(__name__)

# Disable anonymized telemetry
os.environ["ANONYMIZED_TELEMETRY"] = "false"

load_dotenv()
api_key = os.getenv('IBM_API_KEY')
if not api_key:
    raise ValueError('IBM_API_KEY is not set')

Gapi_key = os.getenv('GEMINI_API_KEY')
if not Gapi_key:
    raise ValueError('GEMINI_API_KEY is not set')

# Initialize the Gemini model
llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash-exp', api_key=SecretStr(Gapi_key))

# Instance a Browser
browser = Browser()

# Create the IAM authenticator using your API key
authenticator = IAMAuthenticator(api_key)
service = BaseService(authenticator=authenticator)
token = authenticator.token_manager.get_token()

# Define system prompt
system_prompt = "Please generate a detailed, well-constructed 1-2 sentence instruction based on the user's prompt for another LLM model to perform the user's task."


@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    user_prompt = data.get("prompt")  # type: ignore

    body = {
        "input": f"Prompt: {user_prompt}\n{system_prompt}",
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 900,
            "min_new_tokens": 0,
            "repetition_penalty": 1
        },
        "model_id": "mistralai/mistral-large",
        "project_id": "b1cd01cc-ee57-4ed7-b2ae-fc008ecbbbf0"
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    response = requests.post("https://eu-gb.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29", headers=headers, json=body)

    if response.status_code == 200:
        response_data = response.json()
        generated_instruction = response_data.get("results", [{}])[0].get("generated_text", "").strip()
        print(f"Extracted Instruction: {generated_instruction}")
        return jsonify({"instruction": generated_instruction})
    else:
        return jsonify({"error": "Failed to generate instruction"}), response.status_code


# Run BrowserUse Agent with the instruction
async def do_task(instruction):
    try:
        agent = Agent(
            task=instruction,  # Pass the actual instruction
            llm=llm,
            save_conversation_path="logs/conversation.json",
            browser=browser
        )
        history = await agent.run(max_steps=20)
        print("Task completed successfully.")
        return "complete"
    except Exception as e:
        print(f"Error running agent: {e}")
        return "failed"


@app.route('/run-gemini', methods=['POST'])
def run_gemini():
    data = request.json
    instruction = data.get("instruction") # type: ignore

    if not instruction:
        print("Error: Instruction is missing")
        return jsonify({"error": "Instruction is required"}), 400

    print(f"Running instruction: {instruction}")

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(do_task(instruction))
        return jsonify({"status": result})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to run task"}), 500


@app.route('/')
def home():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
