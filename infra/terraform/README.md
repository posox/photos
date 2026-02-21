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
