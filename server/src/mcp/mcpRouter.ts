import { randomUUID } from "crypto";
import cors from "cors";
import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { ISettingsService } from "@/domain/app-settings/app-settings.service.js";
import type { IUsersRepository } from "@/domain/users/user.repository.interface.js";
import type { User } from "@/domain/users/user.type.js";
import { handleMcpRequest, type McpServices } from "./checkmateMcp.js";

const isUser = (payload: unknown): payload is User => {
	return typeof payload === "object" && payload !== null && "id" in payload && "teamId" in payload && "role" in payload;
};

export const createMcpRouter = ({
	settingsService,
	usersRepository,
	mcpApiToken,
	services,
}: {
	settingsService: ISettingsService;
	usersRepository: IUsersRepository;
	mcpApiToken?: string;
	services: McpServices;
}) => {
	const router = Router();

	router.use(
		cors({
			origin: true,
			credentials: false,
			methods: "GET,HEAD,POST,DELETE,OPTIONS",
			allowedHeaders: ["Content-Type", "Authorization", "Accept", "MCP-Protocol-Version", "Mcp-Session-Id"],
			exposedHeaders: ["Mcp-Session-Id", "MCP-Protocol-Version"],
		})
	);

	const attachSession = (req: Request, res: Response) => {
		const existing = req.headers["mcp-session-id"];
		const sessionId = typeof existing === "string" && existing.length > 0 ? existing : randomUUID();
		res.setHeader("Mcp-Session-Id", sessionId);
	};

	const auth = async (req: Request, res: Response, next: NextFunction) => {
		const header = req.headers.authorization || "";
		if (!header.startsWith("Bearer ")) {
			res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Authorization Bearer token required" } });
			return;
		}
		const token = header.slice("Bearer ".length).trim();
		if (mcpApiToken && token === mcpApiToken) {
			try {
				const users = await usersRepository.findAll();
				const admin = users.find((u) => u.role.includes("superadmin") || u.role.includes("admin")) || users[0];
				if (!admin?.teamId) {
					res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "No Checkmate user to bind MCP token" } });
					return;
				}
				req.user = admin;
				next();
				return;
			} catch (err) {
				next(err);
				return;
			}
		}

		const { jwtSecret } = settingsService.getSettings();
		if (!jwtSecret) {
			res.status(500).json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "JWT secret not configured" } });
			return;
		}
		jwt.verify(token, jwtSecret, (err, decoded) => {
			if (err || !isUser(decoded)) {
				res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid token" } });
				return;
			}
			req.user = decoded;
			next();
		});
	};

	router.get("/", (req, res) => {
		const accept = req.headers.accept || "";
		if (accept.includes("text/event-stream")) {
			res.status(405).set("Allow", "POST").end();
			return;
		}
		res.json({
			name: "checkmate",
			transport: "streamable-http",
			protocol: "MCP",
			endpoint: "POST /api/v1/mcp",
			auth: "Authorization: Bearer <JWT or MCP_API_TOKEN>",
		});
	});

	router.delete("/", (_req, res) => {
		res.status(204).end();
	});

	router.post("/", auth, async (req: Request, res: Response, next: NextFunction) => {
		try {
			const user = req.user;
			if (!user) {
				res.status(401).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } });
				return;
			}
			attachSession(req, res);
			const body = req.body;
			if (Array.isArray(body)) {
				const results = [];
				for (const msg of body) {
					const result = await handleMcpRequest(msg || {}, user, services);
					if (result !== null) {
						results.push(result);
					}
				}
				if (results.length === 0) {
					res.status(202).end();
					return;
				}
				res.json(results);
				return;
			}
			const result = await handleMcpRequest(body || {}, user, services);
			if (result === null) {
				res.status(202).end();
				return;
			}
			res.json(result);
		} catch (err) {
			next(err);
		}
	});

	return router;
};
