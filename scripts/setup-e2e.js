import "dotenv/config";
import { PrismaClient, ROLE } from "@prisma/client";
import { hashSync } from "bcrypt";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let connUrl = "";

const setupUsers = async (connUrl) => {
    const prisma = new PrismaClient({
        datasourceUrl: connUrl,
    });
    const users = await prisma.user.findMany();
    const adminExists = users.some((user) => user.role === ROLE.ADMIN);

    if (!adminExists) {
        const admin = await prisma.user.create({
            data: {
                username: 'admin',
                password: hashSync("arunyaadmin@6969", 10),
                image: `https://api.dicebear.com/9.x/lorelei/svg?seed=admin`,
                name: 'Admin',
                role: ROLE.ADMIN,
            }
        });

        console.log("Admin user created");
    } else {
        console.log("Admin user already exists");
    }

    const writerExists = users.some((user) => user.role === ROLE.WRITE);

    if (!writerExists) {
        const writer = await prisma.user.create({
            data: {
                username: 'write-user',
                password: hashSync("arunyawrite@6969", 10),
                image: `https://api.dicebear.com/9.x/lorelei/svg?seed=write-user`,
                name: 'Writer',
                role: ROLE.WRITE,
            }
        });

        console.log("Writer user created");
    } else {
        console.log("Writer user already exists");
    }

    const readerExists = users.some((user) => user.role === ROLE.READ);

    if (!readerExists) {
        const reader = await prisma.user.create({
            data: {
                username: 'read-user',
                password: hashSync("arunyaread@6969", 10),
                image: `https://api.dicebear.com/9.x/lorelei/svg?seed=read-user`,
                name: 'Reader',
                role: ROLE.READ,
            }
        });

        console.log("Reader user created");
    } else {
        console.log("Reader user already exists");
    }
}

const setupWebsites = async (connUrl) => {
    const prisma = new PrismaClient({
        datasourceUrl: connUrl,
    });

    await prisma.website.createMany({
        data: [
            {
                name: "Demo 1",
                domain: "demo-website-1.com",
            },
            {
                name: "Demo 2",
                domain: "demo-website-2.com",
            },
            {
                name: "Demo 3",
                domain: "demo-website-3.com",
            },
            {
                name: "Demo 4",
                domain: "demo-website-4.com",
            },
            {
                name: "Demo 5",
                domain: "demo-website-5.com",
            }
        ]
    });

    console.log("Demo websites created");
}

const setupStorageState = async () => {
    const storageStatePath = path.join(process.cwd(), '__tests__', 'e2e', 'storage-state.json')

    // If It Exists, Do Remove It
    if (fs.existsSync(storageStatePath)) {
        console.log("Removing existing storage state");
        fs.unlinkSync(storageStatePath);
    }

    const storageState = {
        origins: [],
        cookies: [],
    }

    console.log("Storage state created");
    fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));
}

const main = async () => {
    const container = await new PostgreSqlContainer().withDatabase("arunya").withUsername("arunya").withPassword("arunya").start();
    connUrl = container.getConnectionUri();

    spawnSync("npx", ["prisma", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: connUrl },
        stdio: "inherit",
        shell: true,
    });

    await setupUsers(connUrl);
    await setupWebsites(connUrl);
    await setupStorageState();

    spawnSync("npx", ["playwright", "test"], {
        env: { ...process.env, DATABASE_URL: connUrl },
        stdio: "inherit",
        shell: true,
    })

    console.log("E2E Tests Completed");

    await container.stop();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(() => {
    process.exit(0);
});