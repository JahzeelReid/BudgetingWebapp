A secure, mobile-first budgeting web application that syncs real-time banking data to give users complete control over their finances. Built with a React frontend, a Flask backend, and powered by the Teller API with bank-grade security.

Live Demo Hosted on Render

 Key Features
 Real-Time Bank Syncing: Utilizes the Teller API to securely accrue user banking information, account balances, and transaction history for accurate budgeting.

Bank-Grade Security (mTLS): Implements Mutual TLS (mTLS) authentication utilizing private keys and certificates to establish encrypted, authenticated connections with Teller.io servers.

 Progressive Web App (PWA): Fully optimized as a PWA, allowing users to "Install" the web app directly onto their iOS or Android home screens, complete with native-like UI and Push Notifications.

Production-Ready Database: Powered by SQLAlchemy ORM coupled with a robust PostgreSQL database in production for reliable data persistence and migrations.

Tech Stack
Frontend
React.js (Single Page Application architecture)

Service Workers & Workbox (For PWA caching and offline capabilities)

Web Push API (For mobile notifications)

Backend & Database
Flask (Python) (RESTful API backend)

SQLAlchemy (Object-Relational Mapping)

PostgreSQL (Production database)

Deployment & Infrastructure
Render (Web Service & Managed PostgreSQL hosting)

mTLS Layer (Secure socket layer handling certificates for Teller API)

🚀 Getting Started
To get a local copy up and running, you'll need to set up both the backend and frontend environments.

Prerequisites
Python 3.9+

Node.js & npm

A Teller.io developer account (and your issued mTLS certificates: certificate.pem and private_key.pem)

Backend Setup (Flask)
Clone the repository and navigate to the backend directory:

Bash
git clone https://github.com/JahzeelReid/BudgetingWebapp/tree/fresh-start
cd repo_name/backend
Create and activate a virtual environment:

Bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
Install dependencies:

Bash
pip install -r requirements.txt
Place your Teller mTLS certificates in the backend root directory (or specify their paths in your environment variables).

Create a .env file in the backend root:

Code snippet
FLASK_ENV=development
DATABASE_URL=sqlite:///dev.db
TELLER_APP_ID=your_teller_app_id
TELLER_CERT_PATH=[contents of certificate.pem with newlines replaced with \n]
TELLER_KEY_PATH=[contents of private_key.pem with newlines replaced with \n]
Run the Flask server:

Bash
flask run
Frontend Setup (React PWA)
Navigate to the frontend directory:

Bash
cd ../frontend
Install npm packages:

Bash
npm install
Start the React development server:

Bash
npm start
🌐 Deployment on Render
This app is configured for seamless deployment on Render.

Database: Spin up a Render PostgreSQL instance.

Backend Web Service: * Build Command: pip install -r requirements.txt

Start Command: gunicorn app:app

Add environment variables (DATABASE_URL, TELLER_APP_ID, etc.) in the Render dashboard. 

Frontend Static Site: Deploy the React build directory (npm run build).

📄 License
Distributed under the MIT License. See LICENSE for more information.
