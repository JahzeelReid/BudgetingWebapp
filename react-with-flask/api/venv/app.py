import time
from flask import Flask, request, jsonify
import requests
from requests.auth import HTTPBasicAuth
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
# initialize the app with the extension
db.init_app(app)


class User(db.Model):
    # the user table, this table holds the user Id(which we create)
    # the username and password which we will use to allow people to login and see their data
    # the access token which allows us to make the api call to teller
    # a list of dictionarys that hold the bank accounta associated with the user
    # the format should be {4 digits: xxxx, id/link:}
    # this should allow us to get the access code associated with the user
    # use that to get the related bank accounts
    # with those bank acount links other info like transactions can be queried
    # tracks the date of the last query so that only data newer than that date is added, this prevents duplicate data from being added
    id: Mapped[int] = mapped_column(primary_key=True)
    access_token: Mapped[str] = mapped_column(unique=True)
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str]
    account_list: Mapped[list] = mapped_column(JSON, default=list, nullable=True)
    settings: 
    date: Mapped[str] = mapped_column(nullable=True)


class Account(db.model):
    # table that holds the bank account info
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    current_bal: Mapped[int]


class Transaction(db.Model):
    # a table that holds all the transaction Data
    #
    transaction_id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    transaction_catagory: Mapped[str]
    amount: Mapped[int]
    account_id: Mapped[str] = mapped_column(nullable=True)
    api_id: Mapped[str] = mapped_column(nullable=True)
    date: Mapped[str] = mapped_column(nullable=True)
    catagory_dict: Mapped[str] = mapped_column(nullable=True)


with app.app_context():
    db.create_all()


@app.route("/api/time")
def get_current_time():
    return {"time": time.time()}


@app.route("/api/newuser", methods=["POST"])
def pquery():
    # recieves the access token from the front end
    authjson = request.get_json()
    # prints the access token
    print("Access Token Reponse:")
    print(authjson)
    # pulls vaariables out of the dictionary
    acc_id = authjson["auth"]["user"]["id"]
    user_name = authjson["user"]
    access_token = authjson["auth"]["accessToken"]
    # creats the url and parameters for api get request
    url = "https://api.teller.io/accounts"
    auth = HTTPBasicAuth(
        authjson["auth"]["accessToken"], ""
    )  # Teller uses access_token as username

    # the get request
    accounts_response = requests.get(url, auth=auth)
    # variable to hold the response parsed through json
    # RESPOSE IS A LIST OF ACCOUNTS ASSOCIATED WITH THE USER
    accounts = accounts_response.json()

    if accounts_response.status_code != 200:
        return jsonify({"error": accounts_response.text}), accounts_response.status_code

    # creates the user to init in database
    user = User(
        access_token=access_token,
        username=user_name,
        password="password",
        # account_list=account_id_list,
        # we will update this one after init
    )

    db.session.add(user)
    db.session.commit()
    print("user added")
    # ######
    new_user_id = db.one_or_404(db.select(User).filter_by(username=user_name))
    # so we can add all the transactions
    new_transaction_list = []
    # ######

    print("accounts Response:")
    print(accounts)
    # contains a list of bank account ids linked to the user
    # we will use this to track transactions by account
    account_id_list = []

    for i in range(len(accounts)):
        # grabs the bank account ids and appends to a list that can be added tp the database
        account_id_list.append(accounts[i]["id"])
        print("Account value  ", i)
        url = accounts[i]["links"]["balances"]
        bal_info = requests.get(url, auth=auth)
        print("balance: ", bal_info.json()["available"])

        url = accounts[i]["links"]["transactions"]
        trans_info = requests.get(url, auth=auth)
        print("transaction list: ")
        for j in trans_info.json()[:5]:
            trans_id = j["id"]
            trans_value = j["amount"]
            bank_id = j["account_id"]
            catagory = j["details"]["category"]
            print()
            print("Id: ", trans_id)
            print("Value: ", trans_value)
            print("Account Id: ", bank_id)
            print("Catagory: ", catagory)
            print("Date", j["date"])
            # #####
            # Create a new transaction for every transaction in the list
            new_transaction = Transaction(
                user_id=new_user_id,  # type: ignore
                transaction_catagory=catagory,
                amount=trans_value,
                account_id=bank_id,
                api_id=trans_id,
                date=j["date"],
            )
            # commit transactions
            db.session.add(new_transaction)
            # #####
    # ####
    db.session.commit()
    # ####

    # acc_id = account_info
    # "acc_phbau0vl0jg4d1rtu8000"
    # "acc_phbau0vn0jg4d1rtu8000"

    return {"done": "done"}


@app.route("/api/getbalance", methods=["POST"])
def getbalance():
    # calls the username from the frontend
    # queries that username i the data base
    # if available pulls access token from db
    # recieves the access token from the front end
    authjson = request.get_json()
    # prints the access token
    print("Access Token Reponse:")
    print(authjson)
    # pulls vaariables out of the dictionary
    acc_id = authjson["auth"]["user"]["id"]
    user_name = authjson["user"]
    access_token = authjson["auth"]["accessToken"]
    # creats the url and parameters for api get request
    url = "https://api.teller.io/accounts"
    auth = HTTPBasicAuth(
        authjson["auth"]["accessToken"], ""
    )  # Teller uses access_token as username
    return {"done": "done"}


# https://api.teller.io/accounts/acc_phaouss0gjg4d1rtu8000/balances
# https://api.teller.io/accounts/acc_phaouss1gjg4d1rtu8000/balances


# kick the can without sitting with the mistakes and taking accountability
# Initiate sex
# toy roulletee
# rough sex
# write post it notes


# arcane trickster: 3 level 1 spells, 3 cantrips wizard spells
# cantrip: mage Hand, mind sliver, friends
# level 1: Fog Cloud, sleep, Id Insinuation (UA)
# Tomfoolery: 3 level1, 3 cantrips
# contrips: mending, spare the dying, guidance
# level1: Hex,  charm person, divine favor
