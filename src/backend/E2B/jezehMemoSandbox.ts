import "dotenv/config";
import {Sandbox} from "e2b";


const SANDBOX_TIMEOUT_MS = 60 * 60 * 1_000;

export interface JezehMemoStore {
    getInfo(path: string): Promise<{type: string}>;
    readFile(path: string, options: {format: "bytes"}): Promise<Uint8Array>;
}

let memoSandboxPromise: Promise<Sandbox> | undefined;

async function connectOrCreateMemoSandbox(): Promise<Sandbox> {
    const configuredSandboxId = process.env.E2B_MEMO_SANDBOX_ID?.trim();
    if (configuredSandboxId !== undefined && configuredSandboxId.length > 0) {
        return Sandbox.connect(configuredSandboxId, {
            timeoutMs: SANDBOX_TIMEOUT_MS,
        });
    }

    return Sandbox.create({
        allowInternetAccess: false,
        timeoutMs: SANDBOX_TIMEOUT_MS,
    });
}

/** Reuse one isolated, network-disabled E2B sandbox in this process. */
export function getJezehMemoSandbox(): Promise<Sandbox> {
    if (memoSandboxPromise === undefined) {
        memoSandboxPromise = connectOrCreateMemoSandbox().catch((error: unknown) => {
            memoSandboxPromise = undefined;
            throw error;
        });
    }

    return memoSandboxPromise;
}

export async function getJezehMemoStore(): Promise<JezehMemoStore> {
    const sandbox = await getJezehMemoSandbox();
    return {
        async getInfo(path) {
            const info = await sandbox.files.getInfo(path);
            return {type: info.type ?? "unknown"};
        },
        readFile(path, options) {
            return sandbox.files.read(path, options);
        },
    };
}
