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

# init
# get accesstoken -> call accounts


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
    # account_list: Mapped[list] = mapped_column(JSON, default=list, nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, nullable=True)
    date: Mapped[str] = mapped_column(nullable=True)


class Account(db.Model):
    # table that holds the bank account info
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    current_bal: Mapped[int]
    last_four: Mapped[int] = mapped_column(unique=True)
    url: Mapped[str]


class Transaction(db.Model):
    # a table that holds all the transaction Data
    #
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    account_id: Mapped[int]
    transaction_catagory: Mapped[str]
    amount: Mapped[int]
    account_id: Mapped[str] = mapped_column(nullable=True)
    api_id: Mapped[str] = mapped_column(nullable=True)
    date: Mapped[str] = mapped_column(nullable=True)
    counterparty: Mapped[str] = mapped_column(nullable=True)
    description: Mapped[str] = mapped_column(nullable=True)


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
    print("Received from frontend after Teller init")
    # print(authjson)
    # pulls vaariables out of the dictionary
    acc_id = authjson["auth"]["user"]["id"]
    user_name = authjson["user"]
    access_token = authjson["auth"]["accessToken"]
    print("Account id: ", acc_id, " Username: ", user_name, " Token: ", access_token)
    print("_________________________________")
    # creats the url and parameters for api get request
    url = "https://api.teller.io/accounts"
    auth = HTTPBasicAuth(
        authjson["auth"]["accessToken"], ""
    )  # Teller uses access_token as username

    # the get request
    accounts_response = requests.get(url, auth=auth)
    # variable to hold the response parsed through json
    # RESPOnSE IS A LIST OF ACCOUNTS ASSOCIATED WITH THE USER
    accounts = accounts_response.json()
    print("Received by calling 'accounts'")
    print(accounts)
    print("__________________________________\n\n")

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
    db.session.flush()
    # db.session.commit()
    print("user added")
    # ######
    # new_user = db.one_or_404(db.select(User).filter_by(username=user_name))

    # so we can add all the transactions
    new_transaction_list = []
    # ######

    # contains a list of bank account ids linked to the user
    # we will use this to track transactions by account
    account_id_list = []

    for i in range(len(accounts)):
        # grabs the bank account ids and appends to a list that can be added tp the database
        # skip if credit
        if accounts[i]["type"] == "credit":
            continue

        # account_id_list.append(accounts[i]["id"])
        four_digits = accounts[i]["last_four"]
        url = accounts[i]["links"]["balances"]
        bal_info = requests.get(url, auth=auth)
        # calls the balance from the api
        account_bal = bal_info.json()["available"]
        print("account index: ", i)
        print("balance: ", account_bal)

        url = accounts[i]["links"]["transactions"]
        trans_info = requests.get(url, auth=auth)
        new_acc = Account(
            user_id=user.id,
            current_bal=account_bal,
            last_four=four_digits,
            url=url,
        )
        db.session.add(new_acc)
        db.session.flush()

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
                user_id=user.id,  # type: ignore
                account_id=new_acc.id,
                transaction_catagory=catagory,
                amount=trans_value,
                # account_id=bank_id,
                api_id=trans_id,
                date=j["date"],
            )
            # commit transactions
            db.session.add(new_transaction)
            db.session.flush()
            # #####
    # ####
    # db.session.commit()
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
    # pulls variables out of the dictionary
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


# envelope you have 100,
