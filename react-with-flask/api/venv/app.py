import time
from flask import Flask, request, jsonify
import requests
from requests.auth import HTTPBasicAuth

app = Flask(__name__)


@app.route("/api/time")
def get_current_time():
    return {"time": time.time()}


@app.route("/api/user", methods=["POST"])
def pquery():
    auth = request.get_json()
    print(auth)
    acc_id = auth["auth"]
    url = "https://api.teller.io/accounts"
    auth = HTTPBasicAuth(
        auth["auth"]["accessToken"], ""
    )  # Teller uses access_token as username

    account_info = requests.get(url, auth=auth)
    print(account_info.json())
    acc_id = account_info

    if account_info.status_code != 200:
        return jsonify({"error": account_info.text}), account_info.status_code

    for i in range(len(account_info)):
        print("Account value  ", i)
        url = account_info[i]["balances"]
        bal_info = requests.get(url, auth=auth)

    return {"done": "done"}


# https://api.teller.io/accounts/acc_phaouss0gjg4d1rtu8000/balances
# https://api.teller.io/accounts/acc_phaouss1gjg4d1rtu8000/balances


# kick the can without sitting with the mistakes and taking accountability
