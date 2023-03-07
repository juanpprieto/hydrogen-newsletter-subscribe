# Hydrogen template: Hello World + Newsletter form

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 16.14.0 or higher

```bash
npm create @shopify/hydrogen@latest --template hello-world
```

`/.env`
```bash
# These variables are only available locally in MiniOxygen
SESSION_SECRET=...
# Storefront API vars
PUBLIC_STOREFRONT_API_TOKEN="..."
PUBLIC_STORE_DOMAIN="xyz.myshopify.com"
PUBLIC_STOREFRONT_API_VERSION="2023-01"
PRIVATE_STOREFRONT_API_TOKEN="shpat_..."

# Admin API vars
PRIVATE_ADMIN_API_VERSION="2023-01"
PRIVATE_ADMIN_API_TOKEN="shpat_..."
```

Remember to update `.env` with your shop's domain and Storefront API token!

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```
