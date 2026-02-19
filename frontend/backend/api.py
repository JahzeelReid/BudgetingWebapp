import os
import time
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, String, Float, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import uuid
from functools import wraps
from flask_cors import CORS
import datetime
from requests.auth import HTTPBasicAuth
import requests
import tempfile
from contextlib import contextmanager


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
                "https://opentablexcrm-connections-1.onrender.com",
                "https://app.tabletextpro.com",
            ],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }
    },
)

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


class Bucket(db.Model):
    __tablename__ = "bucket"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    percentage: Mapped[int] = mapped_column(nullable=False)  # e.g. 20 for 20%
    current_balance: Mapped[float] = mapped_column(Float, default=0.0)
    goal_amount: Mapped[float] = mapped_column(Float, nullable=True)

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

    bucket: Mapped["Bucket"] = relationship(back_populates="transactions")
    account: Mapped["Account"] = relationship(back_populates="transactions")


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


@app.route("/api/signup", methods=["POST"])
def register():

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    existing_user = User.query.filter_by(username=username).first()
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
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
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
    data = request.get_json()
    current_user.access_token = data.get("teller_access_token")
    current_user.sync_status = "processing"  # New column in User model
    db.session.commit()

    # 2. Start Sync (In a real app, use a Task Queue like Celery,
    # but for now, we'll run it and return)
    perform_initial_90_day_sync(current_user)

    return jsonify({"message": "Sync started"}), 200


@contextmanager
def teller_mtls_certs():
    # 1. Get the text from environment variables
    cert_data = os.getenv("TELLER_CERT_CONTENT")
    key_data = os.getenv("TELLER_KEY_CONTENT")

    if not cert_data or not key_data:
        raise ValueError("Teller mTLS credentials missing from environment!")

    # 2. Create temporary files
    with tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".crt"
    ) as cert_file, tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".key"
    ) as key_file:

        cert_file.write(cert_data)
        key_file.write(key_data)

        cert_file_path = cert_file.name
        key_file_path = key_file.name

    try:
        # 3. Yield the paths to be used in the request
        yield (cert_file_path, key_file_path)
    finally:
        # 4. Clean up: Delete the temporary files after the request is done
        if os.path.exists(cert_file_path):
            os.remove(cert_file_path)
        if os.path.exists(key_file_path):
            os.remove(key_file_path)


def perform_initial_90_day_sync(user):
    access_token = user.access_token
    auth = HTTPBasicAuth(access_token, "")
    with teller_mtls_certs() as cert_bundle:

        # 1. Get Accounts from Teller
        accounts_response = requests.get(
            "https://api.teller.io/accounts", auth=auth, cert=cert_bundle
        )
        if accounts_response.status_code != 200:
            return jsonify({"error": "Failed to fetch accounts from Teller"}), 400

        accounts = accounts_response.json()
        three_months_ago = (
            datetime.datetime.now() - datetime.timedelta(days=90)
        ).date()

        for acc_data in accounts:

            # 2. Check if account already exists to avoid unique constraint errors
            existing_acc = (
                db.session.query(Account)
                .filter_by(teller_account_id=acc_data["id"])
                .first()
            )
            print(
                "Processing account: ",
                acc_data["id"],
                "Existing in DB? ",
                bool(existing_acc),
                "\n\n",
            )
            if not existing_acc:
                # Fetch Balance for the new account
                bal_info = requests.get(
                    acc_data["links"]["balances"], auth=auth, cert=cert_bundle
                ).json()

                new_acc = Account(
                    user_id=user.id,
                    teller_account_id=acc_data["id"],  # Matches your model
                    institution_name=acc_data.get("institution", {}).get(
                        "name", "Bank"
                    ),
                    current_bal=float(bal_info.get("available", 0.0)),
                    last_four=acc_data["last_four"],
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
                    {"name": "groceries", "perc": 25},
                    {"name": "gas", "perc": 10},
                    {"name": "dining", "perc": 20},
                    {"name": "bills", "perc": 30},
                    {"name": "transportation", "perc": 10},
                    {"name": "general", "perc": 15},
                    {"name": "income", "perc": 0},
                ]
                default_buckets = [
                    {
                        "name": "groceries",
                        "perc": 25,
                        "keywords": ["walmart", "wegmans", "whole foods", "liquor"],
                    },
                    {
                        "name": "gas",
                        "perc": 10,
                        "keywords": ["exxon", "shell", "wawa", "chevron", "sunoco"],
                    },
                    {
                        "name": "dining",
                        "perc": 20,
                        "keywords": [
                            "starbucks",
                            "mcdonalds",
                            "uber eats",
                            "door dash",
                            "pizza",
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
                        ],
                    },
                    {
                        "name": "transportation",
                        "perc": 10,
                        "keywords": ["uber", "lyft", "septa", "train", "parking"],
                    },
                    {"name": "general", "perc": 15, "keywords": []},
                    {
                        "name": "income",
                        "perc": 0,
                        "keywords": ["paycheck", "deposit", "transfer from"],
                    },
                ]
                for b_data in default_buckets:
                    new_b = Bucket(
                        account_id=active_acc.id,
                        name=b_data["name"],
                        percentage=b_data["perc"],
                        current_balance=0.0,
                    )
                    db.session.add(new_b)
                db.session.flush()
                db.session.refresh(active_acc)
                buckets = {b.name: b for b in active_acc.buckets}

            # 4. Fetch Enriched Transactions
            trans_response = requests.get(
                acc_data["links"]["transactions"], auth=auth, cert=cert_bundle
            )
            if trans_response.status_code == 200:
                for tx in reversed(trans_response.json()):
                    # ... (Date filtering logic) ...
                    tx_date = datetime.datetime.strptime(tx["date"], "%Y-%m-%d").date()

                    # 2. Only process if the transaction is within our 90-day window
                    if tx_date < three_months_ago:
                        continue

                    # --- THE ENRICHED SORTING LOGIC ---
                    # Access the 'details' object from Teller
                    details = tx.get("details", {})
                    teller_cat = details.get("category")
                    # print(
                    #     "Transaction: ",
                    #     tx["description"],
                    #     "Teller Category: ",
                    #     teller_cat,
                    # )
                    if (
                        teller_cat == "income"
                        or "paycheck" in tx["description"].lower()
                    ):
                        is_income = True
                    else:
                        is_income = False

                    if is_income:
                        # If this paycheck is newer than the one we have stored
                        if (
                            not active_acc.last_paycheck_date
                            or tx["date"] >= active_acc.last_paycheck_date
                        ):
                            active_acc.last_paycheck_amount = abs(float(tx["amount"]))
                            active_acc.last_paycheck_date = tx["date"]

                            # RESET LOGIC: New paycheck means clear the buckets!
                            for b in active_acc.buckets:
                                b.current_balance = 0.0

                            db.session.flush()

                    # 2. Assign to Bucket (only if it's NOT income)
                    else:
                        # ... your existing bucket assignment logic ...

                        details = tx.get("details", {})
                        teller_cat = details.get("category")  # e.g., "dining"

                        # Look up our mapping, default to "General" if no match

                        # we need to take the catagory and assign it a bucket id
                        current_bucket = Bucket.query.filter_by(
                            account_id=active_acc.id, name=teller_cat
                        ).first()
                        if not current_bucket:
                            current_bucket = Bucket.query.filter_by(
                                account_id=active_acc.id, name="general"
                            ).first()
                        assigned_bucket_id = current_bucket.id

                        new_tx = Transaction(
                            user_id=user.id,
                            account_id=active_acc.id,
                            teller_transaction_id=tx["id"],
                            amount=float(tx["amount"]),
                            description=tx["description"],
                            date=tx["date"],
                            bucket_id=assigned_bucket_id,
                            category=teller_cat,
                        )

                        # Only deduct from bucket if it's an expense (positive amount in Teller)
                        if new_tx.amount < 0 and teller_cat != "income":
                            print(
                                f"Adding to bucket '{current_bucket.name}' with amount {new_tx.amount}"
                            )
                            target_bucket = db.session.get(Bucket, assigned_bucket_id)

                            current_bucket.current_balance += new_tx.amount

                        db.session.add(new_tx)

        db.session.commit()
    return jsonify({"status": "complete", "user_id": user.id})


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
            "buckets": [],
        }

        for bucket in acc.buckets:
            # Simple math for the progress bar: (spent / goal) * 100
            # If goal is None, we just show the balance
            calculated_goal = reference_income * (bucket.percentage / 100.0)
            print(
                f"Bucket: {bucket.name}, Current Balance: {bucket.current_balance}, Goal: {calculated_goal}"
            )
            print(
                f"Reference Income: {reference_income}, Percentage: {bucket.percentage}%"
            )
            acc_data["buckets"].append(
                {
                    "id": bucket.id,
                    "name": bucket.name,
                    "current_balance": bucket.current_balance,
                    "goal_amount": calculated_goal,
                    "percentage": bucket.percentage,
                }
            )
        accounts.append(acc_data)
    # print("Returning buckets for user_id: ", current_user.id, "Accounts: ", accounts)
    return jsonify({"accounts": accounts}), 200


# Create tables logic (Run once)
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
