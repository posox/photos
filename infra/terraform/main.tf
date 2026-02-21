resource "cloudflare_r2_bucket" "photos" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
  location   = var.r2_location
}

resource "cloudflare_pages_project" "site" {
  count = var.enable_pages ? 1 : 0

  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = var.pages_production_branch
}

resource "cloudflare_pages_domain" "custom_domain" {
  count = var.enable_pages && var.enable_pages_custom_domain ? 1 : 0

  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.site[0].name
  domain       = var.pages_custom_domain
}
