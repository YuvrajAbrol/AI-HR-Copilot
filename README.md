# AI HR Copilot

## Overview

AI HR Copilot is an intelligent HR management platform designed to streamline common HR tasks through automation and AI. The application enables HR professionals to quickly access employee information, manage employee records, screen resumes, and receive AI-powered assistance through a conversational interface.

The goal of this project is to reduce repetitive administrative work, improve response time, and provide HR teams with an intuitive, secure, and efficient workspace.

---

# Features

### Dashboard

* HR analytics and employee statistics
* Total employees
* Employees on leave
* New hires
* Quick access to major HR functions

### AI Copilot

* Natural language HR assistant
* Employee information lookup
* Payroll information retrieval
* Leave and PTO information
* Employee profile summaries
* Share AI responses via email

### Employee Management

* Add employees
* Edit employee information
* View employee profiles
* Search employees

### Resume Screening

* Upload resumes
* AI evaluates candidate qualifications
* Resume scoring and recommendations

### Security

* Secure authentication
* Role-based access
* Protected HR data

---

# Project Structure

```
ai-hr-copilot/
│
├── frontend/
├── backend/
├── ai-service/
├── database/
├── docs/
├── tests/
├── .github/
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# Technology Stack

## Frontend

* React
* TypeScript
* HTML
* CSS

## Backend

* Node.js
* Express.js

## AI

* OpenAI API
* Retrieval-Augmented Generation (RAG)

## Database

* SQL Server

## DevOps

* Git
* GitHub
* GitHub Actions
* Docker
* Terraform
* Azure

---

# Team Roles

| Role                      | Responsibility                                                   |
| ------------------------- | ---------------------------------------------------------------- |
| Technical Project Manager | Project planning, coordination, sprint management, documentation |
| Frontend Developer        | User interface and user experience                               |
| Backend Developer         | APIs, authentication, business logic                             |
| AI Engineer               | AI Copilot, prompts, RAG implementation                          |
| Database Engineer         | Database design, queries, optimization                           |
| DevOps Engineer           | CI/CD, deployment, infrastructure                                |
| QA Engineer               | Testing and quality assurance                                    |

---

# Branching Strategy

```
main
develop

feature/*
bugfix/*
hotfix/*
```

All development should occur in feature branches.

No one should commit directly to the `main` branch.

All code changes should be submitted through Pull Requests.

---

# Getting Started

## Clone the repository

```bash
git clone <repository-url>
cd ai-hr-copilot
```

---

## Install dependencies

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
npm install
```

### AI Service

```bash
cd ai-service
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file using `.env.example`.

Example:

```
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

OPENAI_API_KEY=

JWT_SECRET=
```

---

# Running the Project

Start the frontend:

```bash
cd frontend
npm start
```

Start the backend:

```bash
cd backend
npm run dev
```

Start the AI service:

```bash
cd ai-service
python app.py
```

---

# Testing

Run frontend tests:

```bash
npm test
```

Run backend tests:

```bash
npm test
```

---

# Documentation

Additional documentation is available in the `/docs` directory.

* System Architecture
* API Documentation
* Database Design
* AI Agent Design
* SOP
* Meeting Notes

---

# Git Workflow

1. Pull the latest changes from `develop`.
2. Create a new feature branch.
3. Implement your feature.
4. Commit your changes.
5. Push your branch.
6. Open a Pull Request.
7. Request code review.
8. Merge after approval.

---

# Contributors

* Technical Project Manager
* Frontend Developer
* Backend Developer
* AI Engineer
* Database Engineer
* DevOps Engineer
* QA Engineer

---

# License

This project is developed as part of the Quadrant Technologies Summer Internship Program.

All rights reserved.
