import {
    computed,
    ref
} from "vue";

import {
    login as loginRequest
} from "../api/authApi";

import {
    getToken,
    removeToken
} from "../api/httpClient";

export const ROLE_CLAIM =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export const NAME_CLAIM =
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

function decodeBase64Url(value) {
    const normalizedValue = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddingLength =
        (4 - normalizedValue.length % 4) % 4;

    const paddedValue =
        normalizedValue +
        "=".repeat(paddingLength);

    const binaryValue = window.atob(
        paddedValue
    );

    const bytes = Uint8Array.from(
        binaryValue,
        (character) => {
            return character.charCodeAt(0);
        }
    );

    return new TextDecoder().decode(bytes);
}

export function decodeJwtPayload(jwtToken) {
    if (
        typeof jwtToken !== "string" ||
        jwtToken.trim() === ""
    ) {
        return null;
    }

    const tokenParts = jwtToken.split(".");

    if (tokenParts.length !== 3) {
        return null;
    }

    try {
        const payload = decodeBase64Url(
            tokenParts[1]
        );

        const parsedPayload = JSON.parse(
            payload
        );

        if (
            !parsedPayload ||
            typeof parsedPayload !== "object" ||
            Array.isArray(parsedPayload)
        ) {
            return null;
        }

        return parsedPayload;
    } catch (exception) {
        console.error(
            "Не удалось расшифровать JWT:",
            exception
        );

        return null;
    }
}

export function isTokenExpired(jwtToken) {
    const payload = decodeJwtPayload(
        jwtToken
    );

    if (!payload) {
        return true;
    }

    /*
     * Если сервер не добавил exp, токен считается
     * действующим до получения ответа 401.
     */
    if (payload.exp === undefined) {
        return false;
    }

    const expirationTime = Number(
        payload.exp
    );

    if (!Number.isFinite(expirationTime)) {
        return true;
    }

    return Date.now() >=
        expirationTime * 1000;
}

export function getTokenRoles(jwtToken) {
    const payload = decodeJwtPayload(
        jwtToken
    );

    if (!payload) {
        return [];
    }

    const claimValue =
        payload[ROLE_CLAIM] ??
        payload.role ??
        payload.roles;

    if (Array.isArray(claimValue)) {
        return claimValue
            .map((role) => String(role))
            .filter(Boolean);
    }

    if (
        claimValue === undefined ||
        claimValue === null
    ) {
        return [];
    }

    return [String(claimValue)];
}

export function hasTokenRole(
    jwtToken,
    requiredRole
) {
    if (
        !jwtToken ||
        !requiredRole ||
        isTokenExpired(jwtToken)
    ) {
        return false;
    }

    const normalizedRequiredRole = String(
        requiredRole
    ).toLocaleLowerCase("ru");

    return getTokenRoles(jwtToken).some(
        (role) => {
            return role.toLocaleLowerCase("ru") ===
                normalizedRequiredRole;
        }
    );
}

function getInitialToken() {
    const savedToken = getToken();

    if (
        savedToken &&
        isTokenExpired(savedToken)
    ) {
        removeToken();
        return null;
    }

    return savedToken;
}

const token = ref(getInitialToken());

export function useAuth() {
    const payload = computed(() => {
        return decodeJwtPayload(
            token.value
        );
    });

    const isAuthenticated = computed(() => {
        return Boolean(token.value) &&
            !isTokenExpired(token.value);
    });

    const roles = computed(() => {
        return getTokenRoles(token.value);
    });

    const userName = computed(() => {
        return payload.value?.[NAME_CLAIM] ??
            payload.value?.name ??
            "";
    });

    const isAdmin = computed(() => {
        return hasTokenRole(
            token.value,
            "Admin"
        );
    });

    async function login(name, password) {
        const result = await loginRequest(
            name,
            password
        );

        token.value = result.token;

        return result;
    }

    function logout() {
        removeToken();
        token.value = null;
    }

    return {
        token,
        payload,
        roles,
        userName,
        isAdmin,
        isAuthenticated,
        login,
        logout
    };
}