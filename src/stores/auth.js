import { computed, ref } from "vue";
import { login as loginRequest } from "../api/authApi";
import { getToken, removeToken } from "../api/httpClient";

const token = ref(getToken());

export function useAuth() {
    const isAuthenticated = computed(() => Boolean(token.value));

    async function login(name, password) {
        const result = await loginRequest(name, password);
        token.value = result.token;
        return result;
    }

    function logout() {
        removeToken();
        token.value = null;
    }

    return {
        token,
        isAuthenticated,
        login,
        logout
    };
}