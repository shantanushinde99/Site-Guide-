import asyncio
import os
import sys

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr

from browser_use import Agent

# Disable anonymized telemetry
os.environ["ANONYMIZED_TELEMETRY"] = "false"

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError('GEMINI_API_KEY is not set')

llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash-exp', api_key=SecretStr(api_key))

async def run_agent(task_instruction):
    agent = Agent(
        task=task_instruction,
        llm=llm,
        max_actions_per_step=4,
    )

    await agent.run(max_steps=25)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python your_script.py 'Your task instruction here'")
        sys.exit(1)

    task_instruction = sys.argv[1]
    asyncio.run(run_agent(task_instruction))
