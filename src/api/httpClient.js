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

export async function readJson(response) {
    let body = null;

    try {
        body = await response.json();
    } catch {
        body = null;
    }

    if (!response.ok) {
        const message =
            body?.message ||
            body?.detail ||
            `Сервер вернул ошибку ${response.status}`;

        throw new Error(message);
    }

    return body;
}