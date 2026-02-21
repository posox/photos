variable "cloudflare_api_token" {
  description = "Cloudflare API token."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID."
  type        = string
}

variable "pages_project_name" {
  description = "Cloudflare Pages project name."
  type        = string
}

variable "pages_production_branch" {
  description = "Production branch for Cloudflare Pages."
  type        = string
  default     = "main"
}

variable "enable_pages" {
  description = "Create Cloudflare Pages project."
  type        = bool
  default     = true
}

variable "r2_bucket_name" {
  description = "R2 bucket name for photos."
  type        = string
}

variable "r2_location" {
  description = "R2 location hint, e.g. WNAM, ENAM, WEUR, EEUR, APAC, OCE."
  type        = string
  default     = "WNAM"
}

variable "enable_pages_custom_domain" {
  description = "Attach custom domain to Pages project."
  type        = bool
  default     = false
}

variable "pages_custom_domain" {
  description = "Custom domain for Pages, e.g. photos.example.com."
  type        = string
  default     = ""
}
