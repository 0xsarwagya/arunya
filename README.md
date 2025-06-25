<p align="center">
    <!-- Project Banner -->
    <picture>
        <source srcset="./.github/assets/banner-dark.png" media="(prefers-color-scheme: dark)">
        <source srcset="./banner.png" media="(prefers-color-scheme: light)">
        <img src="./.github/assets/banner-light.png" alt="Arunya banner">
    </picture>
    <!-- Project Title -->
    <h2 align="center">
        Arunya
    </h2>
    <!-- Project header -->
    <p align="center">
        The most comprehensive authentication and analytics platform for the web
        <br />
        <a href="https://arunya.0xsarwagya.codes"><strong>Learn more »</strong></a>
        <br />
        <br />
        <a href="https://discord.gg/KWbhFb6Duf">Discord</a>
        ·
        <a href="https://arunya.0xsarwagya.codes">Website</a>
        ·
        <a href="https://github.com/0xsarwagya/arunya/issues">Issues</a>
    </p>
</p>

## About the Project
Arunya was born out of a simple frustration: why should understanding your audience come at the cost of their privacy? As a cybersecurity engineer, I’ve seen how user data is often treated as an afterthought or exploited for profit. When I started building Arunya, the goal was clear—create an analytics tool I’d feel comfortable using myself. One that respects user privacy, stays transparent, and puts you in control. It’s not just about compliance; it’s about trust. Arunya is my answer to balancing insight and integrity, built for anyone who values both.

### Why Arunya
Traditional analytics tools often demand a trade-off between gaining insights and protecting user privacy. Arunya eliminates that compromise. Designed with privacy at its core, it ensures no personal data is stored or shared while providing you with powerful tools like session replays and custom event tracking.

With Arunya, you stay in control. Deploy it on your own infrastructure, maintain compliance with privacy laws like GDPR and CCPA, and gain meaningful insights without sacrificing trust. Whether you’re a developer, a business owner, or a privacy-conscious creator, Arunya offers a solution that respects your users and delivers results.

## Contribution

Arunya is free and open source project licensed under the [AGPL 3.0 License](./LICENSE). You are free to do whatever you want with it.

You could help continuing its development by:

- [Contribute to the source code](./CONTRIBUTING.md)
- [Suggest new features and report issues](https://github.com/0xsarwagya/arunya/issues)

## Security
If you discover a security vulnerability within Better Auth, please send an e-mail to **[contact@0xsarwagya.codes](mailto:contact@0xsarwagya.codes)**.

All reports will be promptly addressed, and you'll be credited accordingly.

## Tech Stack

The Arunya project is powered by an advanced stack of tools and technologies, ensuring optimal performance, maintainability, and developer experience:

## Tech Stack

The Arunya project is powered by an advanced stack of tools and technologies, ensuring optimal performance, maintainability, and developer experience:

<div align="center">
  <!-- Tech Stack Badges -->
  <a href="https://nextjs.org/">
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js Badge"/>
  </a>
  <a href="https://www.postgresql.org/">
    <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL Badge"/>
  </a>
  <a href="https://www.prisma.io/">
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma Badge"/>
  </a>
  <a href="https://shadcn.dev/">
    <img src="https://img.shields.io/badge/ShadCN-000000?style=for-the-badge&logo=shadcn&logoColor=white" alt="ShadCN Badge"/>
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS Badge"/>
  </a>
  <a href="https://zod.dev/">
    <img src="https://img.shields.io/badge/Zod-2D3748?style=for-the-badge&logo=zod&logoColor=white" alt="Zod Badge"/>
  </a>
  <a href="https://swr.vercel.app/">
    <img src="https://img.shields.io/badge/SWR-000000?style=for-the-badge&logo=swr&logoColor=white" alt="SWR Badge"/>
  </a>
  <a href="https://playwright.dev/">
    <img src="https://img.shields.io/badge/Playwright-1D1F2A?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright Badge"/>
  </a>
  <a href="https://rollupjs.org/">
    <img src="https://img.shields.io/badge/Rolldown-EC4A3B?style=for-the-badge&logo=rolldown&logoColor=white" alt="Rolldown Badge"/>
  </a>
</div>

---

### Why This Stack?

- **Next.js**: The foundation for building highly performant and SEO-friendly web applications with built-in SSR and routing.
- **PostgreSQL**: A powerful, open-source relational database used for data storage.
- **Prisma**: A modern ORM that simplifies database queries with type safety and migrations.
- **ShadCN**: A UI framework combining Radix components and Tailwind CSS to provide an accessible, consistent design.
- **Tailwind CSS**: A utility-first CSS framework for fast and responsive UI development.
- **Zod**: Type-safe schema validation for inputs and API routes, ensuring robust error handling and data integrity.
- **SWR**: A library for fetching data with caching, revalidation, and lightweight handling.
- **Playwright**: Cross-browser testing tool that guarantees compatibility and performance across all browsers.
- **Rollup**: Optimizes bundling for libraries and production-ready applications.

## Getting Started

To get started with the **Arunya** project, follow these steps to set up the development environment and get your local instance running.

### Prerequisites

Before you begin, ensure you have the following tools installed:

- **Node.js** (v16.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (installed and running locally)

### 1. Clone the Repository

Clone the project to your local machine using Git:

```bash
git clone https://github.com/0xsarwagya/arunya.git
cd arunya
```

### 2. Set Up PostgreSQL Database

Make sure you have **PostgreSQL** installed and running locally. You can follow the official [PostgreSQL installation guide](https://www.postgresql.org/download/) for your platform.

Once PostgreSQL is running, create a new database using the following commands:

1. Open the PostgreSQL terminal (or use any database client).
2. Run the following SQL command to create a database and user:

```sql
CREATE DATABASE mydatabase;
CREATE USER myuser WITH PASSWORD 'mypassword';
ALTER ROLE myuser SET client_encoding TO 'utf8';
ALTER ROLE myuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE myuser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE mydatabase TO myuser;
```

Make sure to replace `mydatabase`, `myuser`, and `mypassword` with your desired values.

### 3. Install Dependencies

Install the required dependencies with npm:

```bash
npm install
```

### 4. Set Up Environment Variables

Create a `.env` file in the root of the project and copy the contents of `.env.example` into it. Update the values to reflect your local environment configuration.

```bash
cp .env.example .env
```

Edit the `.env` file:

```sh
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public"
BASE_URL="http://localhost:3000"
JWT_KEY="supersecretjwttoken"
```

### 5. Set Up Prisma (Optional)

**PS: This is already run after install is complete**

Run the following Prisma commands to set up the database schema:

```bash
npx prisma migrate deploy   # Apply any migrations if necessary
npx prisma db seed          # Seed the database with initial data (optional)
```

### 6. Running the Development Server

You can run the development server using the following command:

```bash
npm run dev
```

This will start the **Next.js** app and the **Rolldown** tracker in development mode, both running concurrently.

### 7. Running End-to-End Tests

To ensure everything is set up correctly, you can run the end-to-end tests using Playwright:

```bash
npm run test:e2e
```

This will launch the Playwright test suite to verify that the application works across different browsers.

### 8. Build the Application

When you're ready to deploy or create a production build, run:

```bash
npm run build
```

This will build both the **Next.js** application and the **Rolldown** tracker.

---

### Additional Information

- **Linting**: You can lint the project using:

```bash
npm run lint
```

- **Commit Hooks**: This project uses **Husky** for Git hooks to ensure proper code formatting and commit messages.

---

### Troubleshooting

If you run into issues, check that:

- Your PostgreSQL database is running and accessible.
- You have properly set the environment variables in the `.env` file.
- You can access the base URL (`http://localhost:3000`) in your browser.

For any other issues or to report bugs, visit the [Issues](https://github.com/0xsarwagya/arunya/issues) section.