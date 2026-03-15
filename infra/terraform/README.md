# Terraform bootstrap for Cloudflare (R2 + Pages)

This folder creates:
- R2 bucket for JPEG storage.
- Cloudflare Pages project for static site hosting.
- Optional custom domain for Pages.
- Uses remote Terraform state in a separate Cloudflare R2 bucket.

## Prerequisites

- Terraform `>= 1.5`
- Cloudflare API token with permissions:
  - `Account > Cloudflare Pages > Edit`
  - `Account > Workers R2 Storage > Edit`
  - `Zone > DNS > Edit` (only if using custom domain)

## Quick start

1. Copy example vars:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. Fill values in `terraform.tfvars`.

3. Copy backend config:

```bash
cp backend.hcl.example backend.hcl
```

4. Fill values in `backend.hcl`.

5. Export backend credentials for the state bucket:

```bash
export AWS_ACCESS_KEY_ID=replace_me
export AWS_SECRET_ACCESS_KEY=replace_me
```

6. Run:

```bash
terraform init -reconfigure -backend-config=backend.hcl
terraform plan
terraform apply
```

## Notes

- For production, keep secrets out of `terraform.tfvars` and pass `cloudflare_api_token` via `TF_VAR_cloudflare_api_token` environment variable.
- After apply, use output `pages_subdomain` for initial site checks.

## GitHub Actions apply

Workflow file: `.github/workflows/terraform-apply.yml`

Required repository secrets:
- `CLOUDFLARE_API_TOKEN`
- `TF_STATE_ACCESS_KEY_ID`
- `TF_STATE_SECRET_ACCESS_KEY`

Required repository variables:
- `CLOUDFLARE_ACCOUNT_ID`
- `TF_PAGES_PROJECT_NAME`
- `TF_R2_BUCKET_NAME`
- `TF_STATE_BUCKET`

Optional repository variables (defaults are used if omitted):
- `TF_PAGES_PRODUCTION_BRANCH` (default: `main`)
- `TF_ENABLE_PAGES` (default: `true`)
- `TF_R2_LOCATION` (default: `WNAM`)
- `TF_ENABLE_PAGES_CUSTOM_DOMAIN` (default: `false`)
- `TF_PAGES_CUSTOM_DOMAIN` (default: empty)
- `TF_STATE_KEY` (default: `prod/terraform.tfstate`)

Important:
- Keep the state bucket separate from the photo bucket.
- Bootstrap the state bucket manually once before switching this stack to remote state.
