# Terraform bootstrap for Cloudflare (R2 + Pages)

This folder creates:
- R2 bucket for JPEG storage.
- Cloudflare Pages project for static site hosting.
- Optional custom domain for Pages.

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

3. Run:

```bash
terraform init
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

Required repository variables:
- `CLOUDFLARE_ACCOUNT_ID`
- `TF_PAGES_PROJECT_NAME`
- `TF_R2_BUCKET_NAME`

Optional repository variables (defaults are used if omitted):
- `TF_PAGES_PRODUCTION_BRANCH` (default: `main`)
- `TF_ENABLE_PAGES` (default: `true`)
- `TF_R2_LOCATION` (default: `WNAM`)
- `TF_ENABLE_PAGES_CUSTOM_DOMAIN` (default: `false`)
- `TF_PAGES_CUSTOM_DOMAIN` (default: empty)

Important:
- CI needs a remote Terraform backend for stable state management. Without remote backend, every GitHub Actions run starts with empty local state.
