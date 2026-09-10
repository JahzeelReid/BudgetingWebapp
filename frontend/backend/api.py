import os
import time
import traceback
from urllib import response
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import JSON, String, Float, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import uuid
from functools import wraps
from flask_cors import CORS
# import datetime
from datetime import date, datetime, timedelta
from requests.auth import HTTPBasicAuth
import requests
import tempfile
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv
import json
from pywebpush import webpush, WebPushException
from urllib.parse import urlparse
import base64

print(f"DEBUG: VAPID_KEY is {os.getenv('VAPID_CLAIM_EMAIL')}")


# 1. Base Class Setup
class Base(DeclarativeBase):
    pass


app = Flask(__name__)

# cors init
CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://budgeting-frontend-5hif.onrender.com",
            ],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }
    },
)
# This finds the directory of app.py, then goes up one level to the root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# 2. Database Configuration
db_url = os.getenv("DATABASE_URL", "sqlite:///project.db")
# Fix for Heroku/Render Postgres URLs
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-123")

# Initialize Extension
db = SQLAlchemy(model_class=Base, engine_options={"pool_pre_ping": True})
migrate = Migrate(app, db)
db.init_app(app)


# 3. Models
class User(db.Model):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    access_token: Mapped[str] = mapped_column(String(500), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    public_id = db.Column(db.String(50), unique=True)

    # PWA: Store the subscription object from the browser
    # Format: {"endpoint": "...", "keys": {"auth": "...", "p256dh": "..."}}
    push_subscription: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Relationships (modern back_populates style)
    accounts: Mapped[list["Account"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Account(db.Model):
    __tablename__ = "account"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    teller_account_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    enrollment_id: Mapped[str] = mapped_column(String(100), nullable=True)
    institution_name: Mapped[str] = mapped_column(String(100), nullable=True)
    current_bal: Mapped[float] = mapped_column(Float, default=0.0)
    last_four: Mapped[str] = mapped_column(String(4), nullable=False)
    last_paycheck_amount: Mapped[float] = mapped_column(Float, default=0.0)
    last_paycheck_date: Mapped[str] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship(back_populates="accounts")
    buckets: Mapped[list["Bucket"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    records: Mapped[list["Record"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class Bucket(db.Model):
    __tablename__ = "bucket"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    percentage: Mapped[int] = mapped_column(nullable=False)  # e.g. 20 for 20%
    current_balance: Mapped[float] = mapped_column(Float, default=0.0)
    goal_amount: Mapped[float] = mapped_column(Float, nullable=True)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    account: Mapped["Account"] = relationship(back_populates="buckets")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="bucket")


class Transaction(db.Model):
    __tablename__ = "transaction"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    # Linked to our internal bucket
    bucket_id: Mapped[int] = mapped_column(ForeignKey("bucket.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)

    teller_transaction_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(String(200))
    date: Mapped[str] = mapped_column(
        String(50)
    )  # Better as Date type, but kept as Str per your request
    bucket_name: Mapped[str] = mapped_column(String(50), nullable=True)

    bucket: Mapped["Bucket"] = relationship(back_populates="transactions")
    account: Mapped["Account"] = relationship(back_populates="transactions")


class Record(db.Model):
    __tablename__ = "record"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    account: Mapped["Account"] = relationship(back_populates="records")
    income: Mapped[float] = mapped_column(Float, default=0.0)
    paycheck_date: Mapped[str] = mapped_column(String(50), nullable=True)
    bucket_goal: Mapped[dict] = mapped_column(JSON, nullable=True)
    bucket_amount: Mapped[dict] = mapped_column(JSON, nullable=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)


with app.app_context():
    db.create_all()

TELLER_TO_BUCKET_MAP = {
    "dining": "Dining",
    "bar": "Dining",
    "groceries": "Groceries",
    "fuel": "Gas",
    "transportation": "Transport",
    "utilities": "Bills",
    "home": "Bills",
    "income": "Income",  # You might want a bucket for this or ignore it
}

TELLER_TO_BUCKET_MAP = {
    "dining": "dining",
    "bar": "dining",
    "groceries": "groceries",
    "fuel": "gas",
    "transport": "transport",
    "transportation": "transport",
    "utilities": "bills",
    "home": "bills",
    "income": "income",
}


# 4. Routes
@app.route("/api/time")
def get_current_time():
    return jsonify({"time": time.time()})


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            # Decode the token using your SECRET_KEY
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])

            # Use the modern SQLAlchemy 2.0 query style
            # Assuming you used 'public_id' or 'id' in the token payload
            current_user = (
                db.session.query(User).filter_by(public_id=data["public_id"]).first()
            )

            if not current_user:
                return jsonify({"message": "User not found!"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except Exception as e:
            return jsonify({"message": "Token is invalid!"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


# @app.route('/api/simplefin/claim', methods=['GET'])
def claim_simplefin_token(setup_token):
    """Claims a SimpleFIN setup token, exchanges it for a permanent Access URL,

    and returns success.
    """
    # data = request.get_json() or {}
    # setup_token = data.get('setup_token')
    setup_token = "178ADDAC199C07337FF75F93DFE6270649E437AFEC279E0FDFB024BFF1F9DE5C"
    setup_token = "aHR0cHM6Ly9iZXRhLWJyaWRnZS5zaW1wbGVmaW4ub3JnL3NpbXBsZWZpbi9jbGFpbS84QjkwOEQyMzNFRUQxQjdCQTZFMjQzNzM5QTZEMTFGMkJERTY3MkM0MzgzNjNBMjIwRTQ4QjM2MDJBRUVGNDc4MEFDQjNCRTVBQkQ5NTRCQ0NFMUVCMkMxQzIyRjNGNjY3MzNDQTcxOEE4MzhFRjk4RDkxRkRGQUY1OEUyQjNCQg=="
    claim_url = base64.b64decode(setup_token)
    response = requests.post(claim_url)
    access_url = response.text
    print("Successfully claimed SimpleFIN Access URL:", access_url)
    access = "https://213C82032F6081D79DDF23B61E70B7FBBC9E5A3CCA27AF1D186890DB3FC17FE1:9B65371A12B9FB3C7ABE3B6943B91852C05A3C6E3DCD3A74BDD08E023D756720@beta-bridge.simplefin.org/simplefin"
    return jsonify({
            'status': 'success',
            'message': 'Successfully linked SimpleFIN account: ' + access_url,
        }), 200

@app.route('/api/simplefin/acc', methods=['GET'])
def get_simplefin_accounts():
    """Fetches accounts from SimpleFIN using the stored Access URL."""
    access = "https://213C82032F6081D79DDF23B61E70B7FBBC9E5A3CCA27AF1D186890DB3FC17FE1:9B65371A12B9FB3C7ABE3B6943B91852C05A3C6E3DCD3A74BDD08E023D756720@beta-bridge.simplefin.org/simplefin"
    url = f"{access}/accounts"
    
    
    start_date = int((datetime.now() - timedelta(days=30)).timestamp())

    params = {
        'version': '2',
        'start-date': start_date,  # Unix timestamp
        # 'end-date': int(datetime.now().timestamp()) # optional
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
        
    data = response.json()
    print("Fetched SimpleFIN accounts:", data)
    

    return jsonify({
        'status': 'success',
        'message': 'Fetched SimpleFIN accounts: ' + str(data),
    }), 200


@app.route("/api/signup", methods=["POST"])
def register():

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    existing_user = db.session.query(User).filter_by(username=username).first()
    if existing_user:
        return jsonify({"message": "User already exists. Please login."}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(
        public_id=str(uuid.uuid4()),
        username=username,
        password=hashed_password,
        email=email,
        access_token=(
            data.get("access") if data.get("access") else None
        ),  # Optional: Allow setting access token on signup for testing
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Account Created. Please login."}), 200


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    # 1. Find the user
    user = db.session.query(User).filter_by(username=data.get("username")).first()

    # 2. Verify password
    if not user or not check_password_hash(user.password, data.get("password")):
        return jsonify({"message": "Invalid credentials"}), 401

    # 3. Check Teller Status (Your specific flow requirement)
    # This assumes your User model has 'access_token' or you check the Account table
    has_teller = user.access_token is not None

    # 4. Generate JWT
    token = jwt.encode(
        {
            "public_id": user.public_id,
            # "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
            "exp": datetime.utcnow() + timedelta(hours=24)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify({"access_token": token, "has_teller_initialized": has_teller}), 200


@app.route("/api/push/subscribe", methods=["POST"])
@token_required
def subscribe(current_user):
    subscription_data = request.json

    current_user.push_subscription = subscription_data
    db.session.commit()

    return jsonify({"status": "success"}), 200


@app.route("/api/updateaccess", methods=["POST"])
@token_required
def update_access(current_user):
    data = request.get_json()
    user_id = data.get("user_id")
    access_token = data.get("access_token")
    print("updateaccess user_id: ", user_id, "and new token: ", access_token)
    user = User.query.filter_by(id=user_id).first()

    if user:
        user.access_token = access_token
        db.session.commit()
        return jsonify({"message": "Access token updated successfully"}), 200
    else:
        return jsonify({"message": "User not found"}), 404


@app.route("/api/initialize-teller", methods=["POST"])
@token_required
def initialize_teller(current_user):
    # 1. Save Token
    # Change this to take a user provided token from the request body instead of hardcoding
    # add error handling for missing token

    data = request.get_json()
    personal_token = "aHR0cHM6Ly9iZXRhLWJyaWRnZS5zaW1wbGVmaW4ub3JnL3NpbXBsZWZpbi9jbGFpbS8zMkEzOTE4QTU1MUQxQUFFQjc0MkREMUMzMDM1NTJGNTEyODYzOEE5RjI3QjA0OUJFMjk4NzU2NUUzMzI4QTMwNEM5MzlFNzhGQzQ1MjNCNDlBMEFBMTE5REIyOERDNzBDQTRCMzc1QzVEQzAyNkQ2NDY0QTA4M0NDQzM4Q0FDMA=="
    token = claim_simplefin_token(personal_token)  # Claim the token first
    current_user.access_token = token
    current_user.sync_status = "processing"  # New column in User model
    db.session.commit()

    # 2. Start Sync (In a real app, use a Task Queue like Celery,
    # but for now, we'll run it and return)
    perform_initial_90_day_sync(current_user)

    return jsonify({"message": "Sync started"}), 200


# @contextmanager
# def teller_mtls_certs():
#     # 1. Get the text and replace literal \n with actual newline characters
#     cert_raw = os.getenv("TELLER_CERT_CONTENT", "")
#     key_raw = os.getenv("TELLER_KEY_CONTENT", "")

#     # This handles the case where the \n is stored as a literal string
#     cert_data = cert_raw.replace("\\n", "\n")
#     key_data = key_raw.replace("\\n", "\n")

#     if not cert_data or not key_data:
#         raise ValueError("Teller mTLS credentials missing or empty in environment!")

#     # 2. Create temporary files
#     # delete=False is required for Windows compatibility
#     cert_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".crt")
#     key_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".key")

#     cert_file_path = cert_file.name
#     key_file_path = key_file.name

#     try:
#         cert_file.write(cert_data)
#         key_file.write(key_data)

#         # VERY IMPORTANT: Close the files so the OS releases the lock
#         # before 'requests' tries to open them.
#         cert_file.close()
#         key_file.close()

#         # 3. Yield the paths for the request
#         yield (cert_file_path, key_file_path)
#     finally:
#         # 4. Cleanup
#         if os.path.exists(cert_file_path):
#             os.remove(cert_file_path)
#         if os.path.exists(key_file_path):
#             os.remove(key_file_path)

import os
import tempfile
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@contextmanager
def teller_mtls_certs():
    """
    Provides paths to Teller mTLS certificate and key files.
    Prefers local physical files if present (for dev), otherwise
    builds temporary files from environment variables (for prod).
    """
    # 1. Local Dev Bypass: Look for physical files first
    # (Make sure to add the 'certs/' folder to your .gitignore!)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    local_cert_path = os.path.join(base_dir, "certs", "certificate.pem")
    local_key_path = os.path.join(base_dir, "certs", "private_key.pem")

    if os.path.exists(local_cert_path) and os.path.exists(local_key_path):
        logger.debug("Using physical Teller certificates for mTLS.")
        print("Using physical Teller certificates for mTLS.")
        yield (local_cert_path, local_key_path)
        return  # Exit early; no cleanup needed for physical files

    # 2. Production Path: Parse Environment Variables
    # .strip() is crucial here to remove leading/trailing quotes from .env loaders
    cert_raw = os.getenv("TELLER_CERT_CONTENT", "").strip('"').strip("'")
    key_raw = os.getenv("TELLER_KEY_CONTENT", "").strip('"').strip("'")

    if not cert_raw or not key_raw:
        raise ValueError(
            "Teller mTLS credentials missing! Provide local files or environment variables."
        )

    # Convert literal '\n' characters into actual line breaks
    cert_data = cert_raw.replace("\\n", "\n")
    key_data = key_raw.replace("\\n", "\n")

    # 3. Create Temporary Files
    # delete=False is required to prevent Windows from locking/deleting early
    cert_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".crt")
    key_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".key")

    cert_file_path = cert_file.name
    key_file_path = key_file.name

    try:
        cert_file.write(cert_data)
        key_file.write(key_data)

        # VERY IMPORTANT: Close before yielding so 'requests' can open them
        cert_file.close()
        key_file.close()

        yield (cert_file_path, key_file_path)

    finally:
        # 4. Robust Cleanup
        for file_path in (cert_file_path, key_file_path):
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError as e:
                    logger.warning(
                        f"Failed to clean up temp mTLS file {file_path}: {e}"
                    )


def perform_initial_90_day_sync(user):
    # cert_data = os.getenv("TELLER_CERT_CONTENT")
    # key_data = os.getenv("TELLER_KEY_CONTENT")
    # print(
    #     "teller cert data: ", cert_data[:90], "..."
    # )  # Print first 30 chars for sanity check
    # print("teller key data: ", key_data[:90], "...")
    access_token = user.access_token
    auth = HTTPBasicAuth(access_token, "")
    with teller_mtls_certs() as cert_bundle:

        # 1. Get Accounts from Teller
        # accounts_response = requests.get(
        #     "https://api.teller.io/accounts", auth=auth, cert=cert_bundle
        # )
        # Get data from simplefin
        url = f"{access_token}/accounts"
        start_date = int((datetime.now() - timedelta(days=30)).timestamp())
        params = {
            'version': '2',
            'start-date': start_date,  # Unix timestamp
            # 'end-date': int(datetime.now().timestamp()) # optional
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        print("Fetched SimpleFIN accounts:", data)

        # if accounts_response.status_code != 200:
        #     return jsonify({"error": "Failed to fetch accounts from Teller"}), 400

        accounts = data.get("accounts", [])
        # looks like {'errlist': [...], 'accounts': 
        # [{'id':'...', 'name': 'name (last4)', 'balance': '0.0', 'balance-date': 'strange value like 1786752565'}, 
        # {...}]}
        for acc_data in accounts:

            # 2. Check if account already exists to avoid unique constraint errors
            existing_acc = (
                db.session.query(Account)
                .filter_by(teller_account_id=acc_data["id"])
                .first()
            )
            if not existing_acc:
                # Fetch Balance for the new account
                # bal_info = requests.get(
                #     acc_data["links"]["balances"], auth=auth, cert=cert_bundle
                # ).json()
                # no need for bal_info as it
                fin_name = acc_data.get("name", "")
                name, number = fin_name.rstrip(")").rsplit(" (", 1)

                new_acc = Account(
                    user_id=user.id,
                    teller_account_id=acc_data["id"],  # Matches your model
                    institution_name=name,
                    current_bal=float(acc_data.get("balance", 0.0)),
                    last_four=number,
                    enrollment_id=acc_data.get(
                        "conn_id", None
                    ),  # Store enrollment_id if available
                )
                db.session.add(new_acc)
                db.session.flush()  # Populate new_acc.id
                active_acc = new_acc
            else:
                active_acc = existing_acc

            # 3. Setup Buckets (matching Teller's enriched categories)
            buckets = {b.name: b for b in active_acc.buckets}
            if not buckets:
                # We create buckets that match the keys in our map

                default_buckets = [
                    {
                        "name": "groceries",
                        "perc": 10,
                        "keywords": [
                            "walmart",
                            "wegmans",
                            "wholefoods",
                            "whole foods",
                            "liquor",
                            "aldi",
                            "kroger",
                            "publix",
                            "safeway",
                            "trader joe",
                            "costco",
                            "target",
                            "market",
                            "mkt",
                            "grocery",
                            "supermarket",
                            "food mart",
                            "bakery",
                            "bake shop",
                            "butcher",
                            "dairy",
                            "bodega",
                            "mart",
                            "ASSOCIATED FRESH BROOKLYN",
                        ],
                    },
                    {
                        "name": "gas",
                        "perc": 5,
                        "keywords": ["exxon", "shell", "wawa", "chevron", "sunoco"],
                    },
                    {
                        "name": "dining",
                        "perc": 15,
                        "keywords": [
                            "starbucks",
                            "mcdonalds",
                            "uber eats",
                            "doordash",
                            "grubhub",
                            "postmates",
                            "pizza",
                            "deli",
                            "dining",
                            "restaurant",
                            "tasty",
                            "grill",
                            "kitchen",
                            "cafe",
                            "bistro",
                            "pub",
                            "tavern",
                            "bar",
                            "coffee",
                            "bakery",
                            "steakhouse",
                            "sushi",
                            "burger",
                            "diner",
                            "eatery",
                            "chipotle",
                            "panera",
                            "dunkin",
                            "food",
                            "terakawa",
                        ],
                    },
                    {
                        "name": "bills",
                        "perc": 30,
                        "keywords": [
                            "verizon",
                            "peco",
                            "comcast",
                            "netflix",
                            "landlord",
                            "sallie",
                            "hannah",
                            "discord",
                            "spotify",
                            "BK OF AMER VISA",
                        ],
                    },
                    {
                        "name": "transportation",
                        "perc": 5,
                        "keywords": [
                            "uber",
                            "lyft",
                            "septa",
                            "train",
                            "parking",
                            "flix",
                            "mta",
                        ],
                    },
                    {"name": "general", "perc": 10, "keywords": []},
                    {
                        "name": "income",
                        "perc": 0,
                        "keywords": [
                            "paycheck",
                            "deposit",
                            "transfer from",
                            "payroll",
                            "ach dep",
                            "dir dep",
                            "net pay",
                            "salary",
                            "remuneration",
                            "zelle",
                            "venmo",
                            "cash app",
                            "square cash",
                            "paypal",
                            "irs treas",
                            "tax refund",
                            "dividend",
                            "interest",
                        ],
                    },
                    {
                        "name": "subscriptions",
                        "perc": 10,
                        "keywords": [
                            "spotify",
                            "apple music",
                            "netflix",
                            "discord",
                            "fitness",
                            "render",
                        ],
                    },
                ]
                for b_data in default_buckets:
                    new_b = Bucket(
                        account_id=active_acc.id,
                        name=b_data["name"],
                        percentage=b_data["perc"],
                        keywords=b_data["keywords"],
                        current_balance=0.0,
                        user_id=user.id,
                        goal_amount=100.0,
                    )
                    db.session.add(new_b)
                db.session.flush()
                db.session.refresh(active_acc)
                buckets = {b.name: b for b in active_acc.buckets}

            # 4. Fetch Enriched Transactions
            trans_response = acc_data.get("transactions", [])
            transaction_categorization(trans_response, active_acc)

                #     # break

        db.session.commit()
    return jsonify({"status": "complete", "user_id": user.id})


def log_pay_period(account):
    # lets create a log
    current = {}
    goals = {}
    for bucket in account.buckets:
        current[bucket.name] = bucket.current_balance
        goals[bucket.name] = account.last_paycheck_amount * (bucket.percentage / 100.0)
    new_log = Record(
        user_id=account.user_id,
        account=account,
        account_id=account.id,
        income=account.last_paycheck_amount,
        paycheck_date=account.last_paycheck_date,
        bucket_goal=goals,
        bucket_amount=current,
    )
    db.session.add(new_log)
    db.session.commit()


def transaction_categorization(transactions, account):
    print("Starting transaction categorization for account:", account.last_four)
    if account is None:
        check_individual_account_id = True
        new_transactions = transactions
    else:
        check_individual_account_id = False
        new_transactions = transactions

    notifs = []

    for tx in reversed(new_transactions):
        print("Processing transaction: ", tx["id"], "Description: ", tx["description"], "Amount: ", tx["amount"])
        if check_individual_account_id:
            account_id = tx.get("account_id")
            account = (
                db.session.query(Account)
                .filter_by(teller_account_id=account_id)
                .first()
            )
        # ... (Date filtering logic) ...
        # tx_date = datetime.datetime.strptime(tx["date"], "%Y-%m-%d").date()
        # tx_date = datetime.datetime.fromtimestamp(tx["posted"]).date()
        tx_date = datetime.fromtimestamp(tx["posted"]).date()
        # --- THE ENRICHED SORTING LOGIC ---
        # Access the 'details' object from Teller

        # ... your existing bucket assignment logic ...
        id = tx["id"]
        found_tx = (
            db.session.query(Transaction).filter_by(teller_transaction_id=id).first()
        )

        print("Checking transaction ID: ", id, "Found in DB: ", found_tx is not None, "Date: ", tx_date, "Amount: ", tx["amount"], "Description: ", tx["description"])
        if found_tx:
            print("Transaction already exists in DB, skipping: ", id)
            continue  # Skip to the next transaction

        details = tx.get("extra", {})
        teller_cat = details.get("category", None)  # e.g., "dining"

        # Look up our mapping, default to "General" if no match

        # we need to take the catagory and assign it a bucket id

        assigned_bucket = None

        # 2. STEP ONE: Check Custom Keywords (Highest Priority)
        # We look through our database buckets for any keyword matches in the description
        for bucket in account.buckets:
            # We assume you added a 'keywords' field to your Bucket model
            # If it's a string, convert to list: keywords_list = bucket.keywords.split(',')
            if bucket.name.lower() == "income" and float(tx["amount"]) < 0:
                continue  # Don't assign negative transactions to Income bucket
            keywords_list = bucket.keywords if isinstance(bucket.keywords, list) else []
            description_lower = tx["description"].lower()

            # 2. Check if any keyword in the list is a substring of the description
            if any(keyword.lower() in description_lower for keyword in keywords_list):
                assigned_bucket = bucket
                break

        # 3. STEP TWO: Use the Teller Map (Medium Priority)
        if not assigned_bucket:
            target_name = TELLER_TO_BUCKET_MAP.get(teller_cat)
            if target_name:
                # Find the bucket object by name
                assigned_bucket = next(
                    (
                        b
                        for b in account.buckets
                        if b.name.lower() == target_name.lower()
                    ),
                    None,
                )

        # 4. STEP THREE: Final Fallback (Lowest Priority)
        if not assigned_bucket:
            assigned_bucket = next(
                (b for b in account.buckets if b.name.lower() == "general"),
                None,
            )

        assigned_bucket_id = assigned_bucket.id

        if assigned_bucket.name.lower() == "income":
            print("tx_date: ", tx_date, "account.last_paycheck_date: ", account.last_paycheck_date)
            
            if (
                not account.last_paycheck_date
                or tx_date >= date.fromisoformat(str(account.last_paycheck_date))
                # account.last_paycheck_date
            ):
                
                # LOG HERE
                log_pay_period(account)
                account.last_paycheck_amount = abs(float(tx["amount"]))
                account.last_paycheck_date = tx_date

                

                # RESET LOGIC: New paycheck means clear the buckets!
                for b in account.buckets:
                    b.current_balance = 0.0

                db.session.flush()

        new_tx = Transaction(
            user_id=account.user_id,
            account_id=account.id,
            teller_transaction_id=tx["id"],
            amount=float(tx["amount"]),
            description=tx["description"],
            date=tx_date,
            bucket_id=assigned_bucket_id,
            category=teller_cat,
            bucket_name=assigned_bucket.name,
        )

        # Only deduct from bucket if it's an expense (positive amount in Teller)

        # target_bucket = db.session.get(Bucket, assigned_bucket_id)

        assigned_bucket.current_balance += new_tx.amount

        db.session.add(new_tx)
        db.session.commit()
        # break
        present = False
        for notif in notifs:
            if notif["bucket_name"] == new_tx.bucket_name:
                notif["charges"].append(new_tx.amount)
                notif["remainder"] = (
                    assigned_bucket.goal_amount - assigned_bucket.current_balance
                )
                notif["account"] = account
                present = True
        if not present:
            notifs.append(
                {
                    "bucket_name": new_tx.bucket_name,
                    "charges": [new_tx.amount],
                    "remainder": (
                        assigned_bucket.goal_amount - assigned_bucket.current_balance
                    ),
                    "account": account,
                }
            )
    return notifs


@app.route("/api/refresh_transactions", methods=["POST"])
@token_required
def refresh_transactions(current_user):
    # Logic for refreshing transactions
    
    return perform_initial_90_day_sync(current_user)


def update_transaction_count_after_income_change(current_user):
    # paycheck is updated but buckets are not,
    # this code will ilterate throught the accounts from current user
    # set buckets to 0
    # can I update the buckets
    # without changing the transactions
    # I dont know Ill have to check?
    accounts = db.session.query(Account).filter_by(user_id=current_user.id).all()
    for acc in accounts:
        # reset all buckets
        for bucket in acc.buckets:
            bucket.current_balance = 0.0
        # get the last paycheck amount and date
        last_paycheck_amount = acc.last_paycheck_amount
        last_paycheck_date = acc.last_paycheck_date
        # get all transactions after the last paycheck date
        # they transactions can stay in the same bucket but do the addtion over
        # get last paycheck transction id
        last_paycheck_transaction = (
            db.session.query(Transaction)
            .filter(
                Transaction.account_id == acc.id,
                Transaction.date == last_paycheck_date,
                Transaction.amount == last_paycheck_amount,
            )
            .first()
        )
        transactions = (
            db.session.query(Transaction)
            .filter(
                Transaction.account_id == acc.id,
                Transaction.date >= last_paycheck_date,
                Transaction.id != last_paycheck_transaction.id,
            )
            .order_by(Transaction.date.desc())
        ).all()
        for tx in transactions:
            bucket = db.session.query(Bucket).filter_by(id=tx.bucket_id).first()
            bucket.current_balance += tx.amount

    db.session.commit()


@app.route("/api/sync-status", methods=["GET"])
@token_required
def get_sync_status(current_user):
    # Logic: If the user has at least one account, we consider the initial sync 'complete'
    # Alternatively, you can check if current_user.access_token is present.

    user_accounts = db.session.query(Account).filter_by(user_id=current_user.id).all()

    if len(user_accounts) > 0:
        print("Sync complete for user_id: ", current_user.id)
        return jsonify({"status": "complete", "message": "Data is ready"}), 200

    print("Sync still processing for user_id: ", current_user.id),
    perform_initial_90_day_sync(current_user)
    return (
        jsonify(
            {"status": "processing", "message": "Still fetching data from Teller..."}
        ),
        200,
    )


@app.route("/api/buckets", methods=["GET"])
@token_required
def get_user_buckets(current_user):
    # Fetch all accounts for this user
    accounts = []
    for acc in current_user.accounts:
        reference_income = acc.last_paycheck_amount or 0.0
        acc_data = {
            "id": acc.id,
            "institution": acc.institution_name,
            "balance": acc.current_bal,
            "last_four": acc.last_four,
            "last_paycheck": reference_income,
            "last_paycheck_date": acc.last_paycheck_date or "",
            "buckets": [],
            "graph": False,
            "teller_account_id": acc.teller_account_id,
        }

        for bucket in acc.buckets:
            # Simple math for the progress bar: (spent / goal) * 100
            # If goal is None, we just show the balance
            # if bucket.name.lower() == "income":
            #     continue
            calculated_goal = reference_income * (bucket.percentage / 100.0)

            acc_data["buckets"].append(
                {
                    "id": bucket.id,
                    "name": bucket.name,
                    "current_balance": (bucket.current_balance)
                    * -1,  # Convert to positive for frontend
                    "goal_amount": calculated_goal,
                    "percentage": bucket.percentage,
                }
            )
        accounts.append(acc_data)
    # print("Returning buckets for user_id: ", current_user.id, "Accounts: ", accounts)
    return jsonify({"accounts": accounts}), 200

@app.route("/api/bucket-records", methods=["POST"])
@token_required
def get_bucket_records(current_user):
    data = request.get_json()
    accdata = data.get("account")
    account = Account.query.filter_by(id=accdata, user_id=current_user.id).first()
    if not account:
        return jsonify({"error": "Account not found or inaccessible"}), 404
    
    results = {}
    # results : {gas: {goal: [], current: []}, dining: {goal: [], current: []}}}
    # results: [{date}]
    records = Record.query.filter_by(account_id=account.id).order_by(Record.paycheck_date).all()
    formatted_dataset = []
    for record in records:
            # Start the flattened dictionary with the primary X-axis value
            flat_entry = {
                "date": record.paycheck_date
            }
            
            # 3. Append current amounts with the "_current" suffix
            if record.bucket_amount:
                for category, amount in record.bucket_amount.items():
                    # e.g., "groceries_current": 380
                    flat_entry[f"{category}_current"] = amount * -1
            
            # 4. Append goal amounts with the "_goal" suffix
            if record.bucket_goal:
                for category, amount in record.bucket_goal.items():
                    # e.g., "groceries_goal": 400
                    flat_entry[f"{category}_goal"] = amount
            
            formatted_dataset.append(flat_entry)

        # 5. Return the flattened array as JSON
    return jsonify(formatted_dataset), 200
    



@app.route("/api/bucket-transactions", methods=["POST"])
@token_required
def get_bucket_transactions(current_user):
    data = request.get_json()
    bucket_id = data.get("bucket")
    # bucket = Bucket.query.filter_by(id=bucket_id, user_id=current_user.id).first()
    print("Received request for transactions of bucket_id: ", bucket_id)
    bucket = (
        db.session.query(Bucket)
        .filter_by(id=bucket_id, user_id=current_user.id)
        .first()
    )
    print(
        "Fetching transactions for bucket_id: ", bucket.id, "and called: ", bucket.name
    )
    account = Account.query.filter_by(
        id=bucket.account_id, user_id=current_user.id
    ).first()
    if not bucket:
        return jsonify({"error": "Bucket not found or inaccessible"}), 404

    # transactions = Transaction.query.filter_by(user_id=current_user.id, bucket_id=bucket_id,).filter(date >= account.last_paycheck_date).all()
    transactions = (
        Transaction.query.filter(
            Transaction.user_id == current_user.id,
            Transaction.bucket_id == bucket_id,
            Transaction.date >= account.last_paycheck_date,
        )
        .order_by(Transaction.date.desc())
        .all()
    )

    tx_list = []
    for tx in transactions:
        tx_list.append(
            {
                "id": tx.id,
                "description": tx.description,
                "amount": tx.amount,
                "date": tx.date,
                "category": tx.category,
                "account_id": tx.account_id,
            }
        )

    return jsonify({"transactions": tx_list}), 200


def remove_transactions_bucket(account, trans):
    # remove value of transactions from buckets of any transaction between date and last paycheck dat
    # helper function that subtracts the values of transaction that happen after an income is incorretly not applied
    # this is so that we can log the payperiod properly with only the transaction of that pay period in it
    # im thinkking of removing all transaction that have the same date as the paycheck and after

    transactions = (
        Transaction.query.filter(
            Transaction.user_id == trans.user_id,
            Transaction.account_id == trans.account_id,
            # Transaction.bucket_id == transbucket_id,
            Transaction.date >= trans.date,
        )
        .order_by(Transaction.date.desc())
        .all()
        # iterate through this list to remove the balance from the buckets
    )
    for tx in transactions:
        bucket = tx.bucket
        remove_val = tx.amount * -1
        bucket.current_balance += remove_val
    db.session.commit()


@app.route("/api/move_transactions_bucket", methods=["POST"])
@token_required
def move_transactions_bucket(current_user):
    data = request.get_json()
    transaction_id = data.get("transaction_id")
    current_bucket_id = data.get("current_bucket_id")
    new_bucket_id = data.get("new_bucket_id")
    transaction = Transaction.query.filter_by(
        id=transaction_id, user_id=current_user.id
    ).first()
    # to make this work we need to change the transactions bucket id, bucket name, and bucket
    # we need to subtract the amount from the old bucket, add it to the new one
    current_bucket = Bucket.query.filter_by(
        id=current_bucket_id, user_id=current_user.id
    ).first()
    new_bucket = Bucket.query.filter_by(
        id=new_bucket_id, user_id=current_user.id
    ).first()

    if new_bucket.name.lower() == "income" and transaction.amount > 0:
        # We need to chanve bucket id to income
        print(
            "Moving income id: ",
            transaction.id,
            "from bucket: ",
            current_bucket.name,
            "to bucket: ",
            new_bucket.name,
        )

        assigned_bucket_id = new_bucket.id
        account = Account.query.filter_by(
            id=new_bucket.account_id, user_id=current_user.id
        ).first()

        if (
            not account.last_paycheck_date
            or transaction.date >= account.last_paycheck_date
        ):
            # RESET LOGIC: New paycheck means clear the buckets!
            # Remove transactions between now and this income transaction
            remove_transactions_bucket(account, transaction)
            log_pay_period(account)
            account.last_paycheck_amount = abs(float(transaction.amount))
            account.last_paycheck_date = transaction.date
            
            for b in account.buckets:
                b.current_balance = 0.0

            db.session.flush()
        # and then refresh
        transaction.bucket_id = new_bucket_id
        transaction.bucket_name = new_bucket.name
        transaction.bucket = new_bucket
        current_bucket.current_balance -= transaction.amount
        new_bucket.current_balance = transaction.amount
        db.session.commit()
        update_transaction_count_after_income_change(current_user)
        return jsonify({"message": "Transaction moved successfully"}), 200

    elif new_bucket.name.lower() == "income" and transaction.amount < 0:
        # We do nothing and fail silently (Don't allow moving expenses INTO income or moving income OUT of income)
        print("Attempted to move charge of", transaction.amount, "into income bucket")
        return jsonify({"message": "Transaction failed successfully"}), 200

    else:
        print(
            "Moving transaction id: ",
            transaction.id,
            "from bucket: ",
            current_bucket.name,
            "to bucket: ",
            new_bucket.name,
        )

        transaction.bucket_id = new_bucket_id
        transaction.bucket_name = new_bucket.name
        transaction.bucket = new_bucket
        current_bucket.current_balance -= transaction.amount
        new_bucket.current_balance += transaction.amount
        db.session.commit()
        return jsonify({"message": "Transaction moved successfully"}), 200


@app.route("/api/save-subscription", methods=["POST"])
@token_required
def save_subscription(current_user):
    # 1. Capture the incoming JSON from the React frontend
    data = request.get_json()
    # print("Received subscription data: ", data)

    # 2. Validation: Ensure the data isn't empty and contains the 'endpoint'
    # The 'endpoint' is the unique URL provided by Google/Apple/Mozilla
    if not data or "endpoint" not in data.get("sub"):
        return jsonify({"error": "Invalid subscription data"}), 400

    try:
        # 3. Efficiency Check: Only update the DB if the subscription has actually changed
        # This prevents unnecessary database writes if the user clicks 'Enable' multiple times
        new_sub_json = json.dumps(data.get("sub"))

        if current_user.push_subscription != new_sub_json:
            current_user.push_subscription = new_sub_json
            db.session.commit()
            status = "Subscription updated"
        else:
            status = "Subscription already up to date"

        return jsonify({"status": "success", "message": status}), 200

    except Exception as e:
        # 4. Rollback: If the database write fails, undo any pending changes
        db.session.rollback()
        # Log the error for debugging (ideally use app.logger)
        print(f"Error saving subscription for user {current_user.id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/test-push", methods=["POST"])
@token_required
def test_push(current_user):
    try:
        response_tuple = push_notification(
            current_user,
            "LOSER Alert! 🔔",
            "This is a manual trigger from \nyour Flask backend.",
            "/dashboard",
        )
        return response_tuple
    except Exception as e:
        print(f"Error sending push notification for user {current_user.id}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def push_notification(current_user, title, body, url):
    # 1. Check if the user even has a subscription stored
    if not current_user.push_subscription:
        return jsonify({"error": "No subscription found for this user"}), 404

    # 2. Convert the stored string back into a dictionary for pywebpush
    # subscription_info = json.loads(current_user.push_subscription)
    sub_data = current_user.push_subscription
    if isinstance(sub_data, str):
        subscription_info = json.loads(sub_data)

        # If subscription_info is STILL a string after one load, load it again
        # (The classic "Double-JSON" trap)
        if isinstance(subscription_info, str):
            subscription_info = json.loads(subscription_info)
    else:
        subscription_info = sub_data
    print("Testing push with subscription: ", subscription_info)
    # parsed_url = urlparse(subscription_info["endpoint"])
    # audience = f"{parsed_url.scheme}://{parsed_url.netloc}"

    try:
        # 3. Fire the notification
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(
                {
                    "title": title,
                    "body": body,
                    "url": url,  # Where the user goes when they click
                }
            ),
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={
                "sub": os.getenv("VAPID_CLAIM_EMAIL"),
                #   "aud": audience
            },
        )
        return jsonify({"status": "Push sent successfully"}), 200

    except WebPushException as ex:
        print(f"Web Push Error: {ex}")
        return jsonify({"error": str(ex)}), 500


@app.route("/hooks/teller", methods=["POST"])
def teller_webhook():
    # 1. Capture the incoming webhook data from Teller
    data = request.get_json()
    print("Received Teller webhook: ", data)

    # 2. Validate the webhook (e.g., check a signature or secret if Teller provides one)
    # For simplicity, we'll skip this step, but in production, you should verify the source!

    # 3. Process the webhook based on its type
    event_type = data.get("type")
    payload = data.get("payload")

    if event_type == "transactions.processed":
        # Handle new transaction logic here
        print("New transaction created: ", payload)
        # You might want to re-run the categorization logic for this transaction's account
        # Or simply add it to the appropriate bucket based on its details'
        enrollment_id = payload.get("enrollment_id")
        current_acc = (
            db.session.query(Account).filter_by(enrollment_id=enrollment_id).first()
        )
        transaction_list = payload.get("transactions")
        for transaction in transaction_list:
            try:

                transaction_values = transaction_categorization([transaction], None)
                current_acc = transaction_values[0]["account"]
                current_user = (
                    db.session.query(User).filter_by(id=current_acc.user_id).first()
                )
                bucket_name = transaction_values[0]["bucket_name"]
                charge = transaction_values[0]["charges"][0]
                remainder = transaction_values[0]["remainder"]
                if bucket_name == "income":
                    push_notification(
                        current_user,
                        f"New Paycheck of ${charge} Received! 💰",
                        f"Your paycheck has been processed.",
                        "/dashboard",
                    )
                else:
                    push_notification(
                        current_user,
                        f"${remainder} Left in {bucket_name}",
                        f"Recent charge of {charge}",
                        "/dashboard",
                    )

            except Exception as e:
                # 4. Rollback: If the database write fails, undo any pending changes
                db.session.rollback()
                # Log the error for debugging (ideally use app.logger)
                print(f"Error saving subscription for user {current_user.id}: {e}")

        # return a list of transactions that has the bucket
        # Your recent transaction
        # bucket: remaining balance
        # - transaction
        # - transaction

    elif event_type == "enrollment.disconnected":
        # Handle account update logic here (e.g., balance changes)
        print("Account updated: ", payload)
    elif event_type == "account.number_verification.processed":
        # Handle account verification logic here
        print("Account verification result: ", payload)
    else:
        print("Unhandled event type: ", event_type)
        current_user = db.session.query(User).filter_by(id=1).first()
        push_notification(
            current_user,
            "New Teller Webhook",
            f"Received event: {event_type}",
            "/dashboard",
        )

    return jsonify({"status": "Webhook received"}), 200


@app.route("/api/update_bucket_goals", methods=["POST"])
@token_required
def update_bucket_goals(current_user):
    data = request.get_json()
    buckets = data.get("buckets", [])
    T_acc_id = data.get("account_id")
    print("Received bucket goal update: ", buckets)
    acc = db.session.query(Account).filter_by(teller_account_id=T_acc_id).first()
    for b in buckets:
        bucket = (
            db.session.query(Bucket)
            .filter_by(user_id=current_user.id, account_id=acc.id, name=b["name"])
            .first()
        )
        if bucket:
            bucket.percentage = b["percentage"]
            bucket.goal_amount = b["goal_amount"]
        else:
            new_bucket = Bucket(
                account_id=acc.id,
                name=b["name"],
                percentage=b["percentage"],
                keywords=[],
                current_balance=0.0,
                user_id=current_user.id,
                goal_amount=b["goal_amount"],
            )
            db.session.add(new_bucket)

    db.session.commit()

    return jsonify({"status": "Bucket goals updated successfully"}), 200


# Create tables logic (Run once)
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
