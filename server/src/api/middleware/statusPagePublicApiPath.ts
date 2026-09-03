const PUBLIC_STATUS_PAGE_API_PREFIX = "/api/v1/status-page";

export const isPublicStatusPageApiPath = (method: string, path: string): boolean => {
	if (!path.startsWith(PUBLIC_STATUS_PAGE_API_PREFIX)) {
		return false;
	}

	const subPath = path.slice(PUBLIC_STATUS_PAGE_API_PREFIX.length).split("?")[0] ?? "";
	const slug = subPath.replace(/^\//, "");
	const isSubscribe = /^[A-Za-z0-9_-]+\/subscribe$/.test(slug);

	if (isSubscribe) {
		return method === "POST" || method === "OPTIONS";
	}

	if (method !== "GET" && method !== "OPTIONS") {
		return false;
	}

	if (slug === "resolve") {
		return true;
	}

	if (!slug || slug === "team" || slug.includes("/")) {
		return false;
	}

	return true;
};
