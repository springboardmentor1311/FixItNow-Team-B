# FixItNow Team B

Clean project structure:

- `backend/FixItNow` - Spring Boot backend
- `frontend/fixitnow-frontend` - React frontend
- `database/fixitnow.sql` - SQL dump

## Run Backend

```powershell
cd backend/FixItNow
$env:JAVA_HOME='C:\Users\Asus\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot'
mvn spring-boot:run
```

## Run Frontend

```powershell
cd frontend/fixitnow-frontend
npm install
npm start
```

## Database

Backend defaults to embedded H2 for local run.
To use MySQL, import `database/fixitnow.sql` and run backend with MySQL profile/env vars.
