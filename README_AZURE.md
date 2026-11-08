## 📦 CI/CD Pipeline – Azure DevOps

The repository includes a baseline Azure DevOps pipeline definition in `azure-pipelines.yml`. Follow the steps below to integrate the pipeline into a new Azure DevOps project or when moving the repository to a different project.

### 1️⃣ Copy the pipeline file
- Ensure `azure-pipelines.yml` is at the repository root.  
- Commit the file if you haven't already.

### 2️⃣ Configure variables
Edit the `variables:` section of the YAML (or create a Variable Group) to provide values for:
- `apiKey` – your API authentication key.
- `rabbitmqUrl` – connection string for RabbitMQ (or leave empty for the in‑memory fallback).

```yaml
variables:
  apiKey: $(API_KEY)          # <-- replace with your secret variable
  rabbitmqUrl: $(RABBITMQ_URL) # <-- replace with your secret variable
```

Create the corresponding secret variables in Azure Pipelines (**Pipelines → Library → + Variable group**).

### 3️⃣ Secure environment file (optional)
If your project relies on a full `.env` file:
1. Upload the file as a **Secure file** in the pipeline library.  
2. Add a step before `npm ci` to download it:

```yaml
- task: DownloadSecureFile@1
  name: envFile
  inputs:
    secureFile: '.env'
- script: |
    cp $(envFile.secureFilePath) .env
  displayName: 'Restore .env file'
```

### 4️⃣ Adjust triggers (if needed)
The default YAML triggers on `master` branch. Update the `trigger:` and `pr:` sections to match your repository’s branch strategy.

```yaml
trigger:
  branches:
    include:
      - master
      - develop   # add any additional branches
pr:
  branches:
    include:
      - master
```

### 5️⃣ Verify test commands
The pipeline runs the following npm scripts:
- `npm ci` – clean install.
- `npm run test` – Vitest unit tests.
- `npm run test:e2e` – Playwright end‑to‑end tests.

If your project uses different script names, adjust the `script:` steps accordingly.

### 6️⃣ Run the pipeline
- Push a commit to trigger the pipeline, or manually run it from **Pipelines → Runs → Run pipeline**.

For further customization (e.g., caching `node_modules`, publishing additional artifacts), edit the relevant sections in `azure-pipelines.yml`. The file is heavily commented for guidance.
