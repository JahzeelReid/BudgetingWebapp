import time
from flask import Flask, request, jsonify
import requests
from requests.auth import HTTPBasicAuth
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from sqlalchemy.orm.attributes import flag_modified


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
    access_token: Mapped[str] = mapped_column(unique=True, nullable=True)
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str]
    # account_list: Mapped[list] = mapped_column(JSON, default=list, nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, nullable=True)
    date: Mapped[str] = mapped_column(nullable=True)


class Account(db.Model):
    # table that holds the bank account info
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    current_bal: Mapped[float]
    last_four: Mapped[str]
    bal_url: Mapped[str] = mapped_column(nullable=True)
    trans_url: Mapped[str] = mapped_column(nullable=True)
    lastpaycheck_id: Mapped[int] = mapped_column(nullable=True)
    # setting should hold the percentage for each catagory in a dictionary
    setting: Mapped[dict] = mapped_column(JSON, nullable=True)
    # example setting: {
    #                     init: False,
    #                     paycheck_threshold: $1200,
    #                     catagory: {
    #                         Rent: {percent:25, balance:$0, goal: 300},
    #                         Grocery: {percent:25, balance:$0, goal: 300},
    #                         Other: {balance: 0}
    # }}


class Log(db.Model):
    # creates a log so that past payperiods can be viewed
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    paycheck_date: Mapped[str] = mapped_column(nullable=True)
    acc_settings: Mapped[dict] = mapped_column(JSON, nullable=True)
    final_bal: Mapped[float]
    lastPaycheck_id: Mapped[int]
    account_id: Mapped[int]


class Transaction(db.Model):
    # a table that holds all the transaction Data
    #
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int]
    account_id: Mapped[int]
    transaction_catagory: Mapped[str]
    amount: Mapped[float]
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


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if user and user.password == password:
        return jsonify({"message": "Login successful", "user_id": user.id}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401

@app.route("/signup", methods=["POST"])
def signUp():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = User.query.filter_by(username=username).first()

    if user:
        print("Username already exists")
        return jsonify({"message": "Username already exists"}), 401
    else:
        new_user = User(
        access_token="init",
        username=username,
        password=password
        # account_list=account_id_list,
        # we will update this one after init
    )
    db.session.add(new_user)
    db.session.flush()
    db.session.commit()
    
    


@app.route("/api/newuser", methods=["POST"])
def init_user():
    # recieves the access token from the front end
    authjson = request.get_json()
    # prints the access token
    print("Received from frontend after Teller init")
    print(authjson)
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
    # print("Received by calling 'accounts'")
    # print(accounts)
    # print("__________________________________\n\n")

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
    db.session.commit()
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
        bal_url = accounts[i]["links"]["balances"]
        trans_url = accounts[i]["links"]["transactions"]
        bal_info = requests.get(bal_url, auth=auth)
        # calls the balance from the api
        account_bal = bal_info.json()["available"]
        print("account index: ", i)
        print("balance: ", account_bal)

        # url = accounts[i]["links"]["transactions"]
        # trans_info = requests.get(url, auth=auth)
        new_acc = Account(
            user_id=user.id,
            current_bal=account_bal,
            last_four=four_digits,
            bal_url=bal_url,
            trans_url=trans_url,
            setting={
                "init": True,
                "paycheck_threshold": 200,
                "catagory": {
                    "groceries": {"percent": 25, "balance": 0, "goal": 300},
                    "general": {"percent": 25, "balance": 0, "goal": 300},
                    "other": {"percent": 50, "balance": 0, "goal": 300},
                },
            },
        )
        db.session.add(new_acc)
        db.session.flush()
        db.session.commit()

    return {"done": "done"}


@app.route("/api/getusers", methods=["GET"])
def getusers():
    users = User.query.all()
    prod = {"users": []}
    for user in users:
        full_update(user.id)
        accounts = Account.query.filter(Account.user_id == user.id).all()
        accountlist = []
        for account in accounts:
            accountlist.append(
                {
                    "lastfour": account.last_four,
                    "balance": account.current_bal,
                    "settings": account.setting,
                }
            )
        prod["users"].append(
            {
                "id": user.id,
                "username": user.username,
                "account": accountlist,
            }
        )
    return prod


def full_update(user_id):
    # Inputs: user_id | we use this to identify the accounts that will be updated
    # output: 404 | if the user doesn't exist in db
    # Purpose: This function will update all the balances associated
    #     it does this by iterating through the new transactions,
    #     adding the charges to their respective buckets

    # Gets the user object
    user = db.get_or_404(User, user_id)
    # Pulls the access token stored on DB
    token = user.access_token
    # Pulls all related accounts from the api
    auth = HTTPBasicAuth(token, "")
    url = "https://api.teller.io/accounts"
    accounts = requests.get(url, auth=auth).json()
    print("pulled from api")

    # Pulls the accounts we have on File. We will be comparing what we recieve to what we have
    user_accounts = Account.query.filter(Account.user_id == user_id).all()
    # print("pulled from database:")
    database_last4 = []
    for user_account in user_accounts:
        # print(user_account.last_four)
        database_last4.append(user_account.last_four)
    # print("done pulling from db")
    # For loop that iterate through every account we pull from api
    for i in range(len(accounts)):
        # As of now this is a debit account tracker so we exclude credit
        if accounts[i]["type"] == "credit":
            continue

        #######
        # Grabs identifying info from api pulled accounts
        # we use last 4 to identify
        last4 = accounts[i]["last_four"]
        # calls the balance for account so we can update our db
        url = accounts[i]["links"]["balances"]
        bal_info = requests.get(url, auth=auth)
        account_bal = bal_info.json()["available"]
        ######

        # check if account is in db
        # print("current", last4)
        # print("db_last4 array: ", database_last4)
        if last4 in database_last4:
            # print(last4, " is in the db")
            # we update
            # update the database
            #
            # use last4 to query for account id, edit from there
            acc = Account.query.filter(
                Account.user_id == user_id, Account.last_four == last4
            ).first()
            # EDIT BALANCE HERE
            oldbal = acc.current_bal
            acc.current_bal = account_bal
            db.session.commit()
            update_acc_bal(acc, token, oldbal)
        else:
            # If false, the account we pulled from api is new and need to be initialized
            # NOT DONE NEEDS WORK
            new_acc = Account(
                user_id=user.id,
                current_bal=account_bal,
                last_four=last4,
                url=url,
                setting={"init": False},
            )
            db.session.add(new_acc)
            db.session.commit()


def update_acc_bal(acc, token, old_balance):
    # takes an account object, the user token, and the previous balance
    # this function updates the database catagories found in account.settings
    # this function should parse through all new transactions
    # after the date in acc.date
    # if it find income, save the previous settings as a log,
    # update the date and reset the catagories
    # get an list of all new transactions?
    # do transactions come in order?
    # we can go through each transaction in the db if no match, add to list

    url = acc.trans_url
    auth = HTTPBasicAuth(token, "")
    trans_info = requests.get(url, auth=auth).json()
    # print("printing ", trans_info)
    # for each transaction query if
    for j in trans_info:
        trans_id = j["id"]
        trans_value = Decimal(j["amount"])
        bank_id = j["account_id"]
        catagory = j["details"]["category"]
        descrip = j["description"]
        counterparty = j["details"]["counterparty"]["name"]
        # print(catagory)
        transaction = Transaction.query.filter(
            Transaction.user_id == acc.user_id, Transaction.api_id == trans_id
        ).first()
        if transaction:
            # woohoo its already in the database
            pass
        else:
            # not in the database
            # we need to add to the database and update the setting to add the dollar amount to the balances
            # check if amount is positive
            # if positive check if it passes paycheck threshold
            # if so mark as paycheck

            new_transaction = Transaction(
                user_id=acc.user_id,
                account_id=acc.id,
                transaction_catagory=catagory,
                amount=(trans_value),
                # account_id=bank_id,
                api_id=trans_id,
                counterparty=counterparty,
                description=descrip,
                date=j["date"],
            )
            db.session.add(new_transaction)
            db.session.flush()
            db.session.commit()

            if (
                trans_value >= acc.setting["paycheck_threshold"]
                and catagory == "income"
            ):
                # create a log, reset catagory, update account and date
                new_log = Log(
                    user_id=acc.user_id,
                    final_bal=old_balance,
                    lastPaycheck_id=acc.lastpaycheck_id,
                    account_id=acc.id,
                    paycheck_date=acc.paycheck_date,
                    acc_settings=acc.setting,
                )
                # mark as paycheck by updating account id
                print("new paycheck")
                acc.lastpaycheck_id = new_transaction.id
            else:
                print("made it to else")
                # take catagory and iterate through the setting, if the catagory is in settings add the balance to that catagory, if its not in setting
                # add to "other" catagory
                # extract keys from acc setting
                settings = acc.setting
                set_catagories = list(settings["catagory"].keys())
                # print(set_catagories)
                if catagory in set_catagories:
                    catagory_bal = Decimal(settings["catagory"][catagory]["balance"])
                    print("in and adding", trans_value, " to ", catagory_bal)
                    catagory_bal = catagory_bal + trans_value
                    print("new values = ", catagory_bal)
                    settings["catagory"][catagory]["balance"] = float(catagory_bal)
                    print(
                        "value in settings dict :",
                        settings["catagory"][catagory]["balance"],
                    )
                    acc.setting = settings
                    flag_modified(acc, "setting")
                    db.session.commit()

                else:

                    catagory_bal = Decimal(acc.setting["catagory"]["other"]["balance"])
                    print("out adding", trans_value, " to ", catagory_bal)
                    catagory_bal = catagory_bal + trans_value
                    print("new values = ", catagory_bal)

                    settings["catagory"]["other"]["balance"] = float(catagory_bal)
                    print(
                        "value in settings dict :",
                        settings["catagory"]["other"]["balance"],
                    )

                    acc.setting = settings
                    flag_modified(acc, "setting")
                    db.session.commit()
                    print("acc value: ", acc.setting["catagory"]["other"]["balance"])

        db.session.commit()


@app.route("/api/newsettings", methods=["POST"])
def change_settings():
    # should be an api endpoint that recieves setting info from the frontend
    # that setting info is saved to the db
    # need to call update
    # update_acc_bal(acc, token, oldbal)
    data = request.get_json()
    user_id = data["user_id"]
    account_id = data["acc_id"]
    catagory_list = data["catagory"]
    init = data["init"]
    account = Account.query.filter(id=account_id).first()

    if init:
        # we are going to grab the new catagories and refactor on the inside
        # so no disticntion between new catagories and old catagories
        # just grab the catagories from data and repopulate with transactions for each catagory
        # need to refactor update_acc_bal() to incorporate dates
        # we only want from the current pay period
        account.setting["catagory"] = catagory_list

    else:
        # ["settings"] is empty, populate straight from data
        # update init to true
        account.setting["catagory"] = catagory_list
        account.setting["init"] = True

    pass


# https://api.teller.io/accounts/acc_phaouss0gjg4d1rtu8000/balances
# https://api.teller.io/accounts/acc_phaouss1gjg4d1rtu8000/balances
