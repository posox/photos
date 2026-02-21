output "r2_bucket_name" {
  description = "Created R2 bucket name."
  value       = cloudflare_r2_bucket.photos.name
}

output "pages_project_name" {
  description = "Created Pages project name."
  value       = var.enable_pages ? cloudflare_pages_project.site[0].name : null
}

output "pages_subdomain" {
  description = "Cloudflare Pages default subdomain."
  value       = var.enable_pages ? cloudflare_pages_project.site[0].subdomain : null
}
