const TOKEN_KEY = "access_token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function getReturnUrl() {
    return window.location.pathname + window.location.search;
}

export async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();

    headers.set("Accept", "application/json");

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has("Content-Type")
    ) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        removeToken();

        if (!window.location.pathname.startsWith("/login")) {
            window.location.assign(
                `/login?returnUrl=${encodeURIComponent(getReturnUrl())}`
            );
        }
    }

    return response;
}

function getServerErrorMessage(body, status) {
    if (typeof body === "string" && body.trim()) {
        return body.trim();
    }

    if (!body || typeof body !== "object") {
        return `Сервер вернул ошибку ${status}`;
    }

    const directMessage =
        body.message ||
        body.Message ||
        body.detail ||
        body.Detail ||
        body.error ||
        body.Error;

    if (typeof directMessage === "string" && directMessage.trim()) {
        return directMessage.trim();
    }

    if (body.errors && typeof body.errors === "object") {
        const validationMessages = Object.values(body.errors)
            .flat()
            .filter((message) => typeof message === "string" && message.trim())
            .join(" ");

        if (validationMessages) {
            return validationMessages;
        }
    }

    if (typeof body.title === "string" && body.title.trim()) {
        return body.title.trim();
    }

    if (typeof body.Title === "string" && body.Title.trim()) {
        return body.Title.trim();
    }

    return `Сервер вернул ошибку ${status}`;
}

export async function readJson(response) {
    let body = null;

    try {
        const responseText = await response.text();

        if (responseText.trim()) {
            try {
                body = JSON.parse(responseText);
            } catch {
                body = responseText;
            }
        }
    } catch {
        body = null;
    }

    if (!response.ok) {
        throw new Error(
            getServerErrorMessage(body, response.status)
        );
    }

    return body;
}