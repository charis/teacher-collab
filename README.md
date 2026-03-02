## SET UP THE PROJECT LOCALLY

## Step 1: Clone the repository
   Download or clone the project from the Git repository.

## Step 2: Set up environment variables
   Open a terminal, navigate to the project directory, and create a .env file with the following content:

```bash
# Open AI Configuration
OPENAI_API_KEY     = <your OpenAI API key>
OPEN_AI_MODEL      = gpt-3.5-turbo

# PostgreSQL connection string for migrations
DATABASE_URL       = "prisma+postgres://accelerate.prisma-data.net/?api_key=<your key>"

# Passowrd to send e-mails from 'teachercollab.ai@gmail.com'
GMAIL_APP_PASSWORD = <your Gmail app password>

# Application host URL
HOST_URL           = http://localhost:3000

# NextAuth Configuration (see https://next-auth.js.org/configuration/options)
NEXTAUTH_URL       = http://localhost:3000
# You create the NEXTAUTH_SECRET via $openssl rand -base64 32
NEXTAUTH_SECRET    = <output of 'openssl rand -base64 32'>
```

## Step 3: Install dependencies:
     $npm install

## Step 4: Build the project:
     $npm run build

## Step 5: Start the development server
     $npm run dev