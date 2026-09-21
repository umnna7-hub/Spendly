import requests

url = "http://127.0.0.1:5000/budget"

budget = {
    "month": "2026-10",
    "salary": 30000,
    "savings_goal": 15000
}

response = requests.post(url, json=budget)

print(response.json())